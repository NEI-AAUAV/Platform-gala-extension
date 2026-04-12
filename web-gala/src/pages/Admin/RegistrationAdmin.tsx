import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faRotateLeft, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { useRegistrationConfig } from "@/hooks/useRegistrationConfig";
import { MealOption, PaymentContact, PaymentMethod } from "@/config/registrationConfig";
import useTime from "@/hooks/timeHooks/useTime";
import GalaService from "@/services/GalaService";

const INPUT_CLS =
  "rounded-lg border border-white/15 bg-[#1c1c1e] px-3 py-2 text-sm text-white placeholder:text-white/30 caret-white outline-none transition focus:border-light-gold/50";

function Field({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/40">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { readonly value: string; readonly onChange: (v: string) => void; readonly placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={INPUT_CLS}
    />
  );
}

function NumberInput({ value, onChange, min = 0 }: { readonly value: number; readonly onChange: (v: number) => void; readonly min?: number }) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={INPUT_CLS}
    />
  );
}

function DateTimeInput({ value, onChange }: { readonly value: string; readonly onChange: (v: string) => void }) {
  return (
    <input
      type="datetime-local"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${INPUT_CLS} [color-scheme:dark] w-full`}
    />
  );
}

function Toggle({ enabled, onChange, label }: { readonly enabled: boolean; readonly onChange: (v: boolean) => void; readonly label: string }) {
  return (
    <button type="button" onClick={() => onChange(!enabled)} className="flex items-center gap-3">
      <div className={["relative h-5 w-9 rounded-full transition-colors", enabled ? "bg-dark-gold/70" : "bg-white/15"].join(" ")}>
        <span className={["absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", enabled ? "translate-x-4" : "translate-x-0.5"].join(" ")} />
      </div>
      <span className="text-sm text-white/60">{label}</span>
    </button>
  );
}

function Section({ title, children, defaultOpen = false }: { readonly title: string; readonly children: React.ReactNode; readonly defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-white/8 bg-white/3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="font-gala text-sm font-semibold text-white/80">{title}</span>
        <FontAwesomeIcon icon={faChevronDown} className={["text-xs text-white/30 transition-transform", open ? "rotate-180" : ""].join(" ")} />
      </button>
      {open && <div className="flex flex-col gap-4 border-t border-white/6 px-5 pb-5 pt-4">{children}</div>}
    </div>
  );
}

function StringListEditor({ items, onChange, placeholder }: { readonly items: string[]; readonly onChange: (v: string[]) => void; readonly placeholder?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={item + i} className="flex gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => { const next = [...items]; next[i] = e.target.value; onChange(next); }}
            placeholder={placeholder}
            className={`flex-1 ${INPUT_CLS}`}
          />
          <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-red-400/50 transition hover:bg-red-500/10 hover:text-red-400">
            <FontAwesomeIcon icon={faTrash} className="text-xs" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="flex items-center gap-2 self-start rounded-full border border-dashed border-dark-gold/40 px-3 py-1.5 text-xs text-dark-gold/70 transition hover:border-dark-gold hover:text-dark-gold">
        <FontAwesomeIcon icon={faPlus} /> Adicionar item
      </button>
    </div>
  );
}

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

  const getTimeValue = (field: keyof TimeSlots) =>
    timeEdits[field] ?? time?.[field]?.slice(0, 16) ?? "";

  const handleTimeChange = async (field: any, value: string) => {
    setTimeEdits((prev) => ({ ...prev, [field]: value }));
    try {
      await GalaService.time.editTimeSlots({ [field]: value });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Time slots save failed silently
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
            onClick={() => window.open("/api/gala/v1/export/registrations", "_blank")} 
          />
          <ExportButton 
            label="Exportar Pagamentos" 
            onClick={() => window.open("/api/gala/v1/export/payments", "_blank")} 
          />
        </div>
      </Section>

      <Section title="9. Segurança & Regras de Upload">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tamanho Max. Comprovativo (MB)">
            <NumberInput value={5} onChange={() => {}} min={1} />
          </Field>
          <Field label="Formatos Aceites">
            <TextInput value=".pdf, .jpg, .png" onChange={() => {}} />
          </Field>
        </div>
        <p className="text-[0.6rem] text-white/20 italic">Nota: Estas regras são aplicadas no frontend para validação imediata.</p>
      </Section>
    </div>
  );
}
