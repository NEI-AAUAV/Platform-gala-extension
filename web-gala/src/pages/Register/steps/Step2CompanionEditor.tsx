import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { Companion } from "@/hooks/useWizardState";

interface Props {
  readonly companions: Companion[];
  readonly onChange: (companions: Companion[]) => void;
}

const emptyCompanion = (): Companion => ({ name: "", meal: "", allergies: "" });

export default function Step2CompanionEditor({ companions, onChange }: Readonly<Props>) {
  const add = () => onChange([...companions, emptyCompanion()]);
  const remove = (i: number) => onChange(companions.filter((_, idx) => idx !== i));
  const updateName = (i: number, name: string) => {
    const next = companions.map((c, idx) => (idx === i ? { ...c, name } : c));
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {companions.map((c, i) => (
        <CompanionCard
          key={i}
          index={i}
          companion={c}
          onUpdateName={(name) => updateName(i, name)}
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
  readonly index: number;
  readonly companion: Companion;
  readonly onUpdateName: (name: string) => void;
  readonly onRemove: () => void;
}

function CompanionCard({ index, companion, onUpdateName, onRemove }: Readonly<CardProps>) {
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

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`companion-name-${index}`}
          className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/40"
        >
          Nome completo
        </label>
        <input
          id={`companion-name-${index}`}
          type="text"
          value={companion.name}
          onChange={(e) => onUpdateName(e.target.value)}
          placeholder="Ex: João Silva"
          className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white/80 placeholder-white/25 outline-none transition focus:border-light-gold/40"
        />
      </div>
    </div>
  );
}
