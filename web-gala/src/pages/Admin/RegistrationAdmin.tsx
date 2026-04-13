import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faRotateLeft, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { useRegistrationConfig } from "@/hooks/useRegistrationConfig";
import { MealOption, PaymentContact, PaymentMethod } from "@/config/registrationConfig";
import useTime from "@/hooks/timeHooks/useTime";
import GalaService from "@/services/GalaService";
import {
  Field,
  TextInput,
  NumberInput,
  DateTimeInput,
  Toggle,
  Section,
  StringListEditor,
  INPUT_CLS,
} from "./components/AdminUI";


function MealOptionsEditor({ options, onChange }: { readonly options: MealOption[]; readonly onChange: (v: MealOption[]) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((opt, i) => (
        <div key={opt.id} className="grid grid-cols-[1fr_1.5fr_2.5rem] gap-2">
          <input type="text" value={opt.label} onChange={(e) => onChange(options.map((o, idx) => idx === i ? { ...o, label: e.target.value } : o))} placeholder="Nome (ex: Carne)" className={INPUT_CLS} />
          <input type="text" value={opt.description} onChange={(e) => onChange(options.map((o, idx) => idx === i ? { ...o, description: e.target.value } : o))} placeholder="Descrição" className={INPUT_CLS} />
          <button type="button" disabled={options.length <= 1} onClick={() => onChange(options.filter((_, idx) => idx !== i))} className="flex items-center justify-center rounded-lg text-red-400/50 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-20">
            <FontAwesomeIcon icon={faTrash} className="text-xs" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...options, { id: `meal_${Date.now()}`, label: "", description: "" }])} className="flex items-center gap-2 self-start rounded-full border border-dashed border-dark-gold/40 px-3 py-1.5 text-xs text-dark-gold/70 transition hover:border-dark-gold hover:text-dark-gold">
        <FontAwesomeIcon icon={faPlus} /> Adicionar prato
      </button>
    </div>
  );
}

function PaymentContactsEditor({ contacts, onChange }: { readonly contacts: PaymentContact[]; readonly onChange: (v: PaymentContact[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[4rem_1fr_1fr_2.5rem] gap-2 px-1">
        {["Matrícula", "Telefone", "Nome", ""].map((h) => (
          <span key={h} className="text-[0.55rem] uppercase tracking-widest text-white/25">{h}</span>
        ))}
      </div>
      {contacts.map((c, i) => {
        const updateField = (field: keyof PaymentContact, val: string) => {
          onChange(contacts.map((ct, idx) => idx === i ? { ...ct, [field]: val } : ct));
        };
        return (
          <div key={c.name + c.phone + i} className="grid grid-cols-[4rem_1fr_1fr_2.5rem] gap-2">
            {(["year", "phone", "name"] as const).map((field) => (
              <input key={field} type="text" value={c[field]} onChange={(e) => updateField(field, e.target.value)} placeholder={field} className={INPUT_CLS} />
            ))}
            <button type="button" onClick={() => onChange(contacts.filter((_, idx) => idx !== i))} className="flex items-center justify-center rounded-lg text-red-400/50 transition hover:bg-red-500/10 hover:text-red-400">
              <FontAwesomeIcon icon={faTrash} className="text-xs" />
            </button>
          </div>
        );
      })}
      <button type="button" onClick={() => onChange([...contacts, { year: "", phone: "", name: "" }])} className="flex items-center gap-2 self-start rounded-full border border-dashed border-dark-gold/40 px-3 py-1.5 text-xs text-dark-gold/70 transition hover:border-dark-gold hover:text-dark-gold">
        <FontAwesomeIcon icon={faPlus} /> Adicionar contacto
      </button>
    </div>
  );
}

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "mbway", label: "MB Way" },
  { value: "iban", label: "IBAN" },
  { value: "both", label: "Ambos" },
];

function ExportButton({ label, onClick }: { readonly label: string; readonly onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/70 transition hover:border-light-gold/40 hover:text-light-gold"
    >
      <FontAwesomeIcon icon={faChevronDown} className="-rotate-90 text-[0.6rem]" />
      {label}
    </button>
  );
}

export default function RegistrationAdmin() {
  const { config, updateConfig, resetConfig } = useRegistrationConfig();
  const { time } = useTime();
  const [saved, setSaved] = useState(false);
  const [timeEdits, setTimeEdits] = useState<Partial<Record<keyof TimeSlots, string>>>({});

  const getTimeValue = (field: keyof TimeSlots): string => {
    if (field in timeEdits) return timeEdits[field] ?? "";
    return (time as unknown as Record<string, string>)?.[field] ?? "";
  };

  const handleTimeChange = (field: keyof TimeSlots, value: string) => {
    setTimeEdits((prev) => ({ ...prev, [field]: value }));
    saveTime({ [field]: value });
  };

  const saveTime = async (updates: Parameters<typeof GalaService.time.editTimeSlots>[0]) => {
    try {
      await GalaService.time.editTimeSlots(updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Time slots save failed silently — show toast in future
    }
  };

  const save = (updates: Parameters<typeof updateConfig>[0]) => {
    updateConfig(updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">As alterações são guardadas automaticamente.</p>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs font-semibold text-dark-gold/80">✓ Guardado</span>}
          <button type="button" onClick={() => { resetConfig(); setSaved(true); setTimeout(() => setSaved(false), 2000); }} className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/40 transition hover:border-white/30 hover:text-white/70">
            <FontAwesomeIcon icon={faRotateLeft} className="text-[0.6rem]" /> Repor defaults
          </button>
        </div>
      </div>

      <Section title="0. Datas e Fases" defaultOpen>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(
            [
              ["registrationStart", "Início das Inscrições"],
              ["registrationEnd", "Fim das Inscrições"],
              ["tablesStart", "Início das Mesas"],
              ["tablesEnd", "Fim das Mesas"],
              ["nominationsStart", "Início das Nomeações"],
              ["nominationsEnd", "Fim das Nomeações"],
              ["votesStart", "Início das Votações"],
              ["votesEnd", "Fim das Votações"],
              ["galaStart", "Início do Jantar de Gala"],
            ] as [keyof TimeSlots, string][]
          ).map(([field, label]) => (
            <Field key={field} label={label}>
              <DateTimeInput
                value={getTimeValue(field)}
                onChange={(v) => handleTimeChange(field, v)}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="1. Informações do Evento">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Data"><TextInput value={config.eventDate} onChange={(v) => save({ eventDate: v })} placeholder="Ex: 14 de junho de 2025" /></Field>
          <Field label="Horário"><TextInput value={config.eventTime} onChange={(v) => save({ eventTime: v })} placeholder="Ex: 20:00 – 02:00" /></Field>
          <Field label="Local"><TextInput value={config.eventLocation} onChange={(v) => save({ eventLocation: v })} /></Field>
          <Field label="Preço por pessoa (€)"><NumberInput value={config.eventPrice} onChange={(v) => save({ eventPrice: v })} min={0} /></Field>
          <Field label="Abertura das Inscrições"><TextInput value={config.registrationOpenDate} onChange={(v) => save({ registrationOpenDate: v })} /></Field>
          <Field label="Fecho das Inscrições"><TextInput value={config.registrationCloseDate} onChange={(v) => save({ registrationCloseDate: v })} /></Field>
        </div>
      </Section>

      <Section title="2. O que está incluído">
        <StringListEditor items={config.eventIncludes} onChange={(v) => save({ eventIncludes: v })} placeholder="Ex: Entradas" />
      </Section>

      <Section title="3. Regras do Evento">
        <StringListEditor items={config.eventRules} onChange={(v) => save({ eventRules: v })} placeholder="Ex: Inscrições limitadas." />
      </Section>

      <Section title="4. Transporte (Autocarro)">
        <Toggle enabled={config.busEnabled} onChange={(v) => save({ busEnabled: v })} label="Autocarro disponível (ida e volta)" />
        {config.busEnabled && (
          <Field label="Preço por pessoa (€ — 0 = incluído no preço)">
            <NumberInput value={config.busRoundTripPrice} onChange={(v) => save({ busRoundTripPrice: v })} />
          </Field>
        )}
      </Section>

      <Section title="5. Opções de Refeição">
        <MealOptionsEditor options={config.mealOptions} onChange={(v) => save({ mealOptions: v })} />
        <Toggle enabled={config.allergiesRequired} onChange={(v) => save({ allergiesRequired: v })} label="Alergias obrigatórias" />
      </Section>

      <Section title="6. Pagamento">
        <Field label="Método de pagamento">
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => save({ paymentMethod: opt.value })}
                className={[
                  "rounded-full border px-4 py-1.5 text-xs font-semibold transition-all",
                  config.paymentMethod === opt.value
                    ? "border-light-gold/60 bg-light-gold/10 text-light-gold"
                    : "border-white/10 text-white/40 hover:border-white/25 hover:text-white/70",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        {(config.paymentMethod === "iban" || config.paymentMethod === "both") && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="IBAN"><TextInput value={config.ibanNumber} onChange={(v) => save({ ibanNumber: v })} placeholder="PT50 0000 0000 0000 0000 000" /></Field>
            <Field label="Titular da conta"><TextInput value={config.ibanHolder} onChange={(v) => save({ ibanHolder: v })} placeholder="NEI — Núcleo de Estudantes de Informática" /></Field>
          </div>
        )}

        <Field label="Prazo após inscrição (horas)">
          <NumberInput value={config.paymentDeadlineHours} onChange={(v) => save({ paymentDeadlineHours: v })} min={1} />
        </Field>
        <Field label="Data limite de pagamento (texto)">
          <TextInput value={config.paymentDeadlineDate} onChange={(v) => save({ paymentDeadlineDate: v })} placeholder="Ex: 16 de junho (15h)" />
        </Field>
        <Field label="Data limite de escolha de mesa (texto)">
          <TextInput value={config.tableDeadlineDate} onChange={(v) => save({ tableDeadlineDate: v })} placeholder="Ex: 20 de junho" />
        </Field>
        <Field label="Email para comprovativo">
          <TextInput value={config.paymentEmail} onChange={(v) => save({ paymentEmail: v })} placeholder="galacomissao.nei@gmail.com" />
        </Field>
        <Field label="Descrição do pagamento">
          <TextInput value={config.paymentDescription} onChange={(v) => save({ paymentDescription: v })} />
        </Field>

        {(config.paymentMethod === "mbway" || config.paymentMethod === "both") && (
          <Field label="Contactos MB Way por matrícula">
            <PaymentContactsEditor contacts={config.paymentContacts} onChange={(v) => save({ paymentContacts: v })} />
          </Field>
        )}
      </Section>

      <Section title="7. Pagamento Faseado (Dual-Proof)">
        <Toggle
          enabled={config.phasedPaymentEnabled}
          onChange={(v) => save({ phasedPaymentEnabled: v })}
          label="Ativar Pagamento em 2 Fases"
        />
        {config.phasedPaymentEnabled && (
          <div className="grid grid-cols-1 gap-4 mt-2 sm:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-xl bg-white/5 p-4">
              <h4 className="text-[0.6rem] font-bold uppercase tracking-widest text-light-gold/60">Fase 1</h4>
              <Field label="Preço Fase 1 (€)"><NumberInput value={config.phase1Price} onChange={(v) => save({ phase1Price: v })} /></Field>
              <Field label="Deadline Fase 1"><TextInput value={config.phase1Deadline} onChange={(v) => save({ phase1Deadline: v })} /></Field>
            </div>
            <div className="flex flex-col gap-4 rounded-xl bg-white/5 p-4">
              <h4 className="text-[0.6rem] font-bold uppercase tracking-widest text-light-gold/60">Fase 2</h4>
              <Field label="Preço Fase 2 (€)"><NumberInput value={config.phase2Price} onChange={(v) => save({ phase2Price: v })} /></Field>
              <Field label="Deadline Fase 2"><TextInput value={config.phase2Deadline} onChange={(v) => save({ phase2Deadline: v })} /></Field>
            </div>
          </div>
        )}
      </Section>

      <Section title="8. Ferramentas de Exportação">
        <p className="text-xs text-white/40 mb-2">Exporta os dados em formato CSV para gestão externa.</p>
        <div className="flex flex-wrap gap-3">
          <ExportButton
            label="Exportar Inscrições"
            onClick={() => window.open("/api/gala/v1/admin/export/registrations", "_blank")}
          />
          <ExportButton
            label="Exportar Mesas"
            onClick={() => window.open("/api/gala/v1/admin/export/tables", "_blank")}
          />
        </div>
      </Section>

      <Section title="9. Segurança & Regras de Upload">
        <p className="text-xs text-white/40">
          Tamanho máximo: <span className="text-white/60 font-semibold">10 MB</span> por comprovativo. Formatos aceites: <span className="text-white/60 font-semibold">imagens e PDF</span>. Validação aplicada no backend.
        </p>
      </Section>
    </div>
  );
}
