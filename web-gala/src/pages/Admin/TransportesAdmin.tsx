import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useHomepageConfig, type BusVehicle } from "@/hooks/useHomepageConfig";
import {
  Field,
  TextInput,
  Toggle,
  Section,
  INPUT_CLS,
} from "./components/AdminUI";
import BusAssignmentAdmin from "./BusAssignmentAdmin";

function BusesEditor({
  buses,
  onChange,
}: {
  readonly buses: BusVehicle[];
  readonly onChange: (v: BusVehicle[]) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_6rem_2.5rem] gap-2 px-1">
        {["Nome do autocarro", "Lugares", ""].map((h) => (
          <span
            key={h}
            className="text-[0.55rem] uppercase tracking-widest text-white/25"
          >
            {h}
          </span>
        ))}
      </div>
      {buses.map((bus, i) => (
        <div key={bus.id} className="grid grid-cols-[1fr_6rem_2.5rem] gap-2">
          <input
            type="text"
            value={bus.name}
            onChange={(e) =>
              onChange(
                buses.map((b, idx) =>
                  idx === i ? { ...b, name: e.target.value } : b,
                ),
              )
            }
            placeholder="Ex: Autocarro 1"
            className={INPUT_CLS}
          />
          <input
            type="number"
            min={1}
            value={bus.capacity}
            onChange={(e) =>
              onChange(
                buses.map((b, idx) =>
                  idx === i ? { ...b, capacity: Number(e.target.value) } : b,
                ),
              )
            }
            className={INPUT_CLS}
          />
          <button
            type="button"
            onClick={() => onChange(buses.filter((_, idx) => idx !== i))}
            className="flex items-center justify-center text-red-400/50 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <FontAwesomeIcon icon={faTrash} className="text-xs" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...buses,
            { id: `bus_${Date.now()}`, name: "", capacity: 50 },
          ])
        }
        className="flex items-center gap-2 self-start rounded-full border border-dashed border-dark-gold/40 px-3 py-1.5 text-xs text-dark-gold/70 transition hover:border-dark-gold hover:text-dark-gold"
      >
        <FontAwesomeIcon icon={faPlus} /> Adicionar autocarro
      </button>
    </div>
  );
}

export default function TransportesAdmin() {
  const { config, updateSection } = useHomepageConfig();
  const [saved, setSaved] = useState(false);

  const save = <K extends keyof typeof config>(
    section: K,
    updates: Partial<(typeof config)[K]>,
  ) => {
    updateSection(section, updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">
          Configura os autocarros e atribui lugares aos inscritos.
        </p>
        {saved && (
          <span className="text-xs font-semibold text-dark-gold/80">
            ✓ Guardado
          </span>
        )}
      </div>

      <Section title="Configuração" defaultOpen>
        <Toggle
          enabled={config.bus_schedule.visible}
          onChange={(v) => save("bus_schedule", { visible: v })}
          label="Mostrar secção dos autocarros na homepage"
        />
        {config.bus_schedule.visible && (
          <>
            <Field label="Local de partida">
              <TextInput
                value={config.bus_schedule.departure_location}
                onChange={(v) =>
                  save("bus_schedule", { departure_location: v })
                }
                placeholder="Ex: Rotunda do Rossio, Aveiro"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Hora de partida">
                <TextInput
                  value={config.bus_schedule.departure_time}
                  onChange={(v) => save("bus_schedule", { departure_time: v })}
                  placeholder="Ex: 19:30"
                />
              </Field>
              <Field label="Hora de regresso">
                <TextInput
                  value={config.bus_schedule.return_time}
                  onChange={(v) => save("bus_schedule", { return_time: v })}
                  placeholder="Ex: 02:00"
                />
              </Field>
            </div>
            <Field label="Autocarros">
              <BusesEditor
                buses={config.bus_schedule.buses}
                onChange={(v) => save("bus_schedule", { buses: v })}
              />
            </Field>
          </>
        )}
      </Section>

      <Section title="Atribuição" defaultOpen>
        <BusAssignmentAdmin />
      </Section>
    </div>
  );
}
