import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faLeaf, faUtensils } from "@fortawesome/free-solid-svg-icons";
import { Companion } from "@/hooks/useWizardState";
import { MealOption } from "@/config/registrationConfig";

interface Props {
  companions: Companion[];
  mealOptions: MealOption[];
  onChange: (companions: Companion[]) => void;
}

const emptyCompanion = (): Companion => ({ name: "", meal: "", allergies: "" });

export default function Step2CompanionEditor({ companions, mealOptions, onChange }: Props) {
  const add = () => onChange([...companions, emptyCompanion()]);
  const remove = (i: number) => onChange(companions.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<Companion>) => {
    const next = companions.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {companions.map((c, i) => (
        <CompanionCard
          key={i}
          index={i}
          companion={c}
          mealOptions={mealOptions}
          onUpdate={(patch) => update(i, patch)}
          onRemove={() => remove(i)}
        />
      ))}

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-2 self-start rounded-full border border-dashed border-light-gold/30 px-4 py-2 text-xs font-semibold text-light-gold/60 transition hover:border-light-gold/60 hover:text-light-gold"
      >
        <FontAwesomeIcon icon={faPlus} />
        Adicionar acompanhante
      </button>
    </div>
  );
}

interface CardProps {
  index: number;
  companion: Companion;
  mealOptions: MealOption[];
  onUpdate: (patch: Partial<Companion>) => void;
  onRemove: () => void;
}

function CompanionCard({ index, companion, mealOptions, onUpdate, onRemove }: CardProps) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/40">
          Acompanhante {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400/50 transition hover:bg-red-500/10 hover:text-red-400"
        >
          <FontAwesomeIcon icon={faTrash} className="text-xs" />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/40">
            Nome completo
          </label>
          <input
            type="text"
            value={companion.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Ex: João Silva"
            className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white/80 placeholder-white/25 outline-none transition focus:border-light-gold/40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/40">
            Prato principal
          </label>
          <div className="flex flex-wrap gap-2">
            {mealOptions.map((meal) => {
              const isSelected = companion.meal === meal.id;
              const icon = meal.id === "veg" ? faLeaf : faUtensils;
              return (
                <button
                  key={meal.id}
                  type="button"
                  onClick={() => onUpdate({ meal: meal.id })}
                  className={[
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
                    isSelected
                      ? "border-light-gold/60 bg-light-gold/10 text-light-gold"
                      : "border-white/10 text-white/45 hover:border-white/25",
                  ].join(" ")}
                >
                  <FontAwesomeIcon icon={icon} className="text-[0.65rem]" />
                  {meal.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/40">
            Alergias (opcional)
          </label>
          <input
            type="text"
            value={companion.allergies}
            onChange={(e) => onUpdate({ allergies: e.target.value })}
            placeholder="Ex: intolerância à lactose"
            className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white/80 placeholder-white/25 outline-none transition focus:border-light-gold/40"
          />
        </div>
      </div>
    </div>
  );
}
