import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBus, faUtensils, faLeaf, faBan } from "@fortawesome/free-solid-svg-icons";
import { RegistrationConfig } from "@/config/registrationConfig";
import { WizardData, BusOption } from "@/hooks/useWizardState";

interface Props {
  config: RegistrationConfig;
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const BUS_OPTIONS: { value: BusOption; label: string; sub: string; icon: typeof faBus }[] = [
  { value: "round_trip", label: "Autocarro (Ida e Volta)", sub: "Transporte incluído na inscrição", icon: faBus },
  { value: "none", label: "Deslocação própria", sub: "Sem autocarro", icon: faBan },
];

export default function Step3Logistics({ config, data, onUpdate, onNext, onBack }: Props) {
  const handleNext = () => {
    if (!data.meal) return;
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
              const showPrice = opt.value === "round_trip" && config.busRoundTripPrice > 0;
              const included = opt.value === "round_trip" && config.busRoundTripPrice === 0;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUpdate({ bus: opt.value })}
                  className={[
                    "flex flex-col gap-2 rounded-xl border p-4 text-left transition-all",
                    isSelected
                      ? "border-light-gold/60 bg-light-gold/8"
                      : "border-white/8 bg-white/3 hover:border-white/20",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <FontAwesomeIcon
                      icon={opt.icon}
                      className={isSelected ? "text-light-gold" : "text-white/30"}
                    />
                    {isSelected && <span className="h-2 w-2 rounded-full bg-light-gold" />}
                  </div>
                  <p className={["text-sm font-bold", isSelected ? "text-light-gold" : "text-white/60"].join(" ")}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-white/35">{opt.sub}</p>
                  {showPrice && (
                    <p className="text-xs font-semibold text-dark-gold/80">+{config.busRoundTripPrice}€ por pessoa</p>
                  )}
                  {included && (
                    <p className="text-xs text-white/25">Incluído no preço</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MealSection config={config} data={data} onUpdate={onUpdate} />
        <AllergiesSection config={config} data={data} onUpdate={onUpdate} />
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="border border-white/15 px-6 py-2.5 font-gala text-sm font-semibold text-white/50 transition-all hover:border-white/30 hover:text-white/80"
        >
          ← Voltar
        </button>
        <button
          onClick={handleNext}
          disabled={!data.meal}
          className="border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continuar → Pagamento
        </button>
      </div>
    </motion.div>
  );
}

function MealSection({
  config,
  data,
  onUpdate,
}: {
  config: RegistrationConfig;
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <FontAwesomeIcon icon={faUtensils} className="text-light-gold/50" />
        <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
          Prato Principal
        </h3>
      </div>
      <div className="flex flex-col gap-3">
        {config.mealOptions.map((meal) => {
          const isSelected = data.meal === meal.id;
          const icon = meal.id === "veg" ? faLeaf : faUtensils;
          return (
            <button
              key={meal.id}
              type="button"
              onClick={() => onUpdate({ meal: meal.id })}
              className={[
                "flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
                isSelected
                  ? "border-light-gold/60 bg-light-gold/8"
                  : "border-white/8 bg-white/3 hover:border-white/20",
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                  isSelected ? "bg-light-gold/20" : "bg-white/5",
                ].join(" ")}
              >
                <FontAwesomeIcon
                  icon={icon}
                  className={isSelected ? "text-light-gold" : "text-white/30"}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className={["font-bold", isSelected ? "text-light-gold" : "text-white/70"].join(" ")}>
                  {meal.label}
                </p>
                <p className="text-xs text-white/40">{meal.description}</p>
              </div>
              {isSelected && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-light-gold" />}
            </button>
          );
        })}
        {!data.meal && (
          <p className="text-xs text-red-400/70">Deves escolher um prato para continuar.</p>
        )}
      </div>
    </div>
  );
}

function AllergiesSection({
  config,
  data,
  onUpdate,
}: {
  config: RegistrationConfig;
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
        Alergias Alimentares
        {config.allergiesRequired && <span className="ml-2 text-red-400/70">*</span>}
      </h3>
      <div className="flex h-full flex-col gap-3 rounded-xl border border-white/8 bg-white/4 p-5">
        <p className="text-xs text-white/45">
          Descreve quaisquer alergias ou intolerâncias alimentares.
          {!config.allergiesRequired && " (Opcional)"}
        </p>
        <textarea
          value={data.allergies}
          onChange={(e) => onUpdate({ allergies: e.target.value })}
          placeholder="Ex: alergia a frutos secos, intolerância à lactose..."
          rows={5}
          className="flex-1 resize-none rounded-lg border border-white/10 bg-transparent px-4 py-3 text-sm text-white/80 placeholder-white/25 outline-none transition focus:border-light-gold/50"
        />
        <p className="text-[0.6rem] text-white/25">
          Se não tens alergias, podes deixar em branco.
        </p>
      </div>
    </div>
  );
}
