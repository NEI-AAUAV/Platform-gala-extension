import { useEffect, useRef, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { useRegistrationConfig } from "@/hooks/useRegistrationConfig";
import {
  MealOption,
  PaymentContact,
  PaymentMethod,
} from "@/config/registrationConfig";
import useTime from "@/hooks/timeHooks/useTime";
import GalaService from "@/services/GalaService";
import useLimits from "@/hooks/useLimits";
import { useAppToast } from "@/components/ui/Toast";
import { useHomepageConfig } from "@/hooks/useHomepageConfig";
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
import { utcIsoToLocalInput, localInputToUtcIso } from "@/utils/datetime";

// ─── Types (local) — TimeSlots and User are global ambient types from .d.ts ──

// ─── Section index definition ─────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: "dates", label: "1. Datas do sistema" },
  { id: "event", label: "2. Informações do evento" },
  { id: "includes", label: "3. O que está incluído" },
  { id: "rules", label: "4. Regras" },
  { id: "bus", label: "5. Transporte" },
  { id: "meals", label: "6. Refeições" },
  { id: "payment", label: "7. Pagamento" },
  { id: "phased", label: "8. Pag. faseado" },
  { id: "limits", label: "9. Limites" },
  { id: "emails", label: "10. Notificações por E-mail" },
  { id: "security", label: "11. Segurança" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function MealOptionsEditor({
  options,
  onChange,
}: {
  readonly options: MealOption[];
  readonly onChange: (v: MealOption[]) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((opt, i) => (
        <div key={opt.id} className="grid grid-cols-[1fr_1.5fr_2.5rem] gap-2">
          <input
            type="text"
            value={opt.label}
            onChange={(e) =>
              onChange(
                options.map((o, idx) =>
                  idx === i ? { ...o, label: e.target.value } : o,
                ),
              )
            }
            placeholder="Nome (ex: Carne)"
            className={INPUT_CLS}
          />
          <input
            type="text"
            value={opt.description}
            onChange={(e) =>
              onChange(
                options.map((o, idx) =>
                  idx === i ? { ...o, description: e.target.value } : o,
                ),
              )
            }
            placeholder="Descrição"
            className={INPUT_CLS}
          />
          <button
            type="button"
            disabled={options.length <= 1}
            onClick={() => onChange(options.filter((_, idx) => idx !== i))}
            className="flex items-center justify-center rounded-lg text-red-400/50 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-20"
          >
            <FontAwesomeIcon icon={faTrash} className="text-xs" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...options,
            { id: `meal_${Date.now()}`, label: "", description: "" },
          ])
        }
        className="flex items-center gap-2 self-start rounded-full border border-dashed border-dark-gold/40 px-3 py-1.5 text-xs text-dark-gold/70 transition hover:border-dark-gold hover:text-dark-gold"
      >
        <FontAwesomeIcon icon={faPlus} /> Adicionar prato
      </button>
    </div>
  );
}

function PaymentContactsEditor({
  contacts,
  onChange,
}: {
  readonly contacts: PaymentContact[];
  readonly onChange: (v: PaymentContact[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[4rem_1fr_1fr_2.5rem] gap-2 px-1">
        {["Matrícula", "Telefone", "Nome", ""].map((h) => (
          <span
            key={h}
            className="text-[0.55rem] uppercase tracking-widest text-white/25"
          >
            {h}
          </span>
        ))}
      </div>
      {contacts.map((c, i) => {
        const updateField = (field: keyof PaymentContact, val: string) => {
          onChange(
            contacts.map((ct, idx) =>
              idx === i ? { ...ct, [field]: val } : ct,
            ),
          );
        };
        return (
          <div
            key={i}
            className="grid grid-cols-[4rem_1fr_1fr_2.5rem] gap-2"
          >
            {(["year", "phone", "name"] as const).map((field) => (
              <input
                key={field}
                type="text"
                value={c[field]}
                onChange={(e) => updateField(field, e.target.value)}
                placeholder={field}
                className={INPUT_CLS}
              />
            ))}
            <button
              type="button"
              onClick={() => onChange(contacts.filter((_, idx) => idx !== i))}
              className="flex items-center justify-center rounded-lg text-red-400/50 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <FontAwesomeIcon icon={faTrash} className="text-xs" />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() =>
          onChange([...contacts, { year: "", phone: "", name: "" }])
        }
        className="flex items-center gap-2 self-start rounded-full border border-dashed border-dark-gold/40 px-3 py-1.5 text-xs text-dark-gold/70 transition hover:border-dark-gold hover:text-dark-gold"
      >
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

// ─── Sticky section index nav ─────────────────────────────────────────────────

function SectionIndex({
  activeSection,
  onNavigate,
}: {
  readonly activeSection: string;
  readonly onNavigate: (id: string) => void;
}) {
  return (
    <aside className="hidden w-44 shrink-0 xl:block">
      <nav className="sticky top-4 flex flex-col gap-0.5">
        <p className="mb-2 px-2 text-[0.55rem] font-bold uppercase tracking-[0.2em] text-white/25">
          Secções
        </p>
        {NAV_SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            className={[
              "rounded-lg px-3 py-2 text-left text-[0.65rem] font-semibold leading-snug transition-all",
              activeSection === id
                ? "bg-dark-gold/15 text-dark-gold"
                : "text-white/30 hover:bg-white/5 hover:text-white/60",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function RegistrationAdmin() {
  const { config, updateConfig, resetConfig } = useRegistrationConfig();
  const { emailConfig, updateEmails } = useHomepageConfig();
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("dates");

  // Refs for each section div
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const save = (updates: Parameters<typeof updateConfig>[0]) => {
    updateConfig(updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Navigate to section by scrolling parent container
  const navigateTo = useCallback((id: string) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    // Find nearest scrollable ancestor
    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      const { overflowY } = globalThis.getComputedStyle(parent);
      if (overflowY === "auto" || overflowY === "scroll") break;
      parent = parent.parentElement;
    }
    if (parent && parent !== document.body) {
      const offset = el.offsetTop - (parent as HTMLElement).offsetTop - 16;
      (parent as HTMLElement).scrollTop = offset;
    } else {
      globalThis.scrollTo({
        top: el.getBoundingClientRect().top + globalThis.scrollY - 100,
      });
    }
    setActiveSection(id);
  }, []);

  // IntersectionObserver to track active section
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    NAV_SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { threshold: 0.3 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const ref = (id: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[id] = el;
  };

  return (
    <div className="flex gap-8">
      <SectionIndex activeSection={activeSection} onNavigate={navigateTo} />

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/40">
            As alterações são guardadas automaticamente.
          </p>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-xs font-semibold text-dark-gold/80">
                ✓ Guardado
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                resetConfig();
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
              }}
              className="border-white/15 flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs text-white/40 transition hover:border-white/30 hover:text-white/70"
            >
              <FontAwesomeIcon icon={faRotateLeft} className="text-[0.6rem]" />{" "}
              Repor defaults
            </button>
          </div>
        </div>

        <div ref={ref("dates")}>
          <Section title="1. Datas do Sistema" defaultOpen>
            <p className="text-xs text-white/40">
              Controla quando cada fase está aberta. As datas das mesas são
              geridas no separador{" "}
              <span className="font-semibold text-white/60">Mesas</span>.
            </p>
            <SystemDatesEditor />
          </Section>
        </div>

        <div ref={ref("event")}>
          <Section title="2. Informações do Evento">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Local">
                <TextInput
                  value={config.eventLocation}
                  onChange={(v) => save({ eventLocation: v })}
                />
              </Field>
              <Field label="Preço por pessoa (€)">
                <NumberInput
                  value={config.eventPrice}
                  onChange={(v) => save({ eventPrice: v })}
                  min={0}
                />
              </Field>
            </div>
          </Section>
        </div>

        <div ref={ref("includes")}>
          <Section title="3. O que está incluído">
            <StringListEditor
              items={config.eventIncludes}
              onChange={(v) => save({ eventIncludes: v })}
              placeholder="Ex: Entradas"
            />
          </Section>
        </div>

        <div ref={ref("rules")}>
          <Section title="4. Regras do Evento">
            <StringListEditor
              items={config.eventRules}
              onChange={(v) => save({ eventRules: v })}
              placeholder="Ex: Inscrições limitadas."
            />
          </Section>
        </div>

        <div ref={ref("bus")}>
          <Section title="5. Transporte (Autocarro)">
            <Toggle
              enabled={config.busEnabled}
              onChange={(v) => save({ busEnabled: v })}
              label="Autocarro disponível (ida e volta)"
            />
            {config.busEnabled && (
              <Field label="Preço por pessoa (€ — 0 = incluído no preço)">
                <NumberInput
                  value={config.busRoundTripPrice}
                  onChange={(v) => save({ busRoundTripPrice: v })}
                />
              </Field>
            )}
          </Section>
        </div>

        <div ref={ref("meals")}>
          <Section title="6. Opções de Refeição">
            <MealOptionsEditor
              options={config.mealOptions}
              onChange={(v) => save({ mealOptions: v })}
            />
            <Toggle
              enabled={config.allergiesRequired}
              onChange={(v) => save({ allergiesRequired: v })}
              label="Alergias obrigatórias"
            />
          </Section>
        </div>

        <div ref={ref("payment")}>
          <Section title="7. Pagamento">
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

            {(config.paymentMethod === "iban" ||
              config.paymentMethod === "both") && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="IBAN">
                  <TextInput
                    value={config.ibanNumber}
                    onChange={(v) => save({ ibanNumber: v })}
                    placeholder="PT50 0000 0000 0000 0000 000"
                  />
                </Field>
                <Field label="Titular da conta">
                  <TextInput
                    value={config.ibanHolder}
                    onChange={(v) => save({ ibanHolder: v })}
                    placeholder="NEI — Núcleo de Estudantes de Informática"
                  />
                </Field>
              </div>
            )}

            <Field label="Prazo após inscrição (horas)">
              <NumberInput
                value={config.paymentDeadlineHours}
                onChange={(v) => save({ paymentDeadlineHours: v })}
                min={1}
              />
            </Field>
            <Field label="Data limite de pagamento (texto)">
              <TextInput
                value={config.paymentDeadlineDate}
                onChange={(v) => save({ paymentDeadlineDate: v })}
                placeholder="Ex: 16 de junho (15h)"
              />
            </Field>
            <Field label="Email para comprovativo">
              <TextInput
                value={config.paymentEmail}
                onChange={(v) => save({ paymentEmail: v })}
                placeholder="galacomissao.nei@gmail.com"
              />
            </Field>
            <Field label="Descrição do pagamento">
              <TextInput
                value={config.paymentDescription}
                onChange={(v) => save({ paymentDescription: v })}
              />
            </Field>

            {(config.paymentMethod === "mbway" ||
              config.paymentMethod === "both") && (
              <Field label="Contactos MB Way por matrícula">
                <PaymentContactsEditor
                  contacts={config.paymentContacts}
                  onChange={(v) => save({ paymentContacts: v })}
                />
              </Field>
            )}
          </Section>
        </div>

        <div ref={ref("phased")}>
          <Section title="8. Pagamento Faseado (Dual-Proof)">
            <Toggle
              enabled={config.phasedPaymentEnabled}
              onChange={(v) => save({ phasedPaymentEnabled: v })}
              label="Ativar Pagamento em 2 Fases"
            />
            {config.phasedPaymentEnabled && (
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-4 rounded-xl bg-white/5 p-4">
                  <h4 className="text-[0.6rem] font-bold uppercase tracking-widest text-light-gold/60">
                    Fase 1
                  </h4>
                  <Field label="Preço Fase 1 (€)">
                    <NumberInput
                      value={config.phase1Price}
                      onChange={(v) => save({ phase1Price: v })}
                    />
                  </Field>
                  <Field label="Deadline Fase 1">
                    <TextInput
                      value={config.phase1Deadline}
                      onChange={(v) => save({ phase1Deadline: v })}
                    />
                  </Field>
                </div>
                <div className="flex flex-col gap-4 rounded-xl bg-white/5 p-4">
                  <h4 className="text-[0.6rem] font-bold uppercase tracking-widest text-light-gold/60">
                    Fase 2
                  </h4>
                  <Field label="Preço Fase 2 (€)">
                    <NumberInput
                      value={config.phase2Price}
                      onChange={(v) => save({ phase2Price: v })}
                    />
                  </Field>
                  <Field label="Deadline Fase 2">
                    <TextInput
                      value={config.phase2Deadline}
                      onChange={(v) => save({ phase2Deadline: v })}
                    />
                  </Field>
                </div>
              </div>
            )}
          </Section>
        </div>

        <div ref={ref("limits")}>
          <Section title="9. Limites">
            <LimitsEditor />
          </Section>
        </div>

        <div ref={ref("emails")}>
          <Section title="10. Notificações por E-mail">
            <p className="mb-4 text-xs text-white/40">
              Escolha quais os e-mails automáticos que o sistema deve enviar aos
              utilizadores.
            </p>
            <div className="flex flex-col gap-4">
              <Toggle
                enabled={emailConfig.registration_confirmed}
                onChange={(v) => {
                  updateEmails({ registration_confirmed: v });
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                }}
                label="Confirmação de Inscrição (Submissão inicial)"
              />
              <Toggle
                enabled={emailConfig.payment_confirmed}
                onChange={(v) => {
                  updateEmails({ payment_confirmed: v });
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                }}
                label="Confirmação de Pagamento"
              />
              <Toggle
                enabled={emailConfig.payment_rejected}
                onChange={(v) => {
                  updateEmails({ payment_rejected: v });
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                }}
                label="Rejeição de Comprovativo de Pagamento"
              />
              <Toggle
                enabled={emailConfig.table_invite}
                onChange={(v) => {
                  updateEmails({ table_invite: v });
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                }}
                label="Convite para Mesa"
              />
              <Toggle
                enabled={emailConfig.table_confirmed}
                onChange={(v) => {
                  updateEmails({ table_confirmed: v });
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                }}
                label="Confirmação de Entrada em Mesa"
              />
            </div>
          </Section>
        </div>

        <div ref={ref("security")}>
          <Section title="11. Segurança & Regras de Upload">
            <p className="text-xs text-white/40">
              Tamanho máximo:{" "}
              <span className="font-semibold text-white/60">10 MB</span> por
              comprovativo. Formatos aceites:{" "}
              <span className="font-semibold text-white/60">imagens e PDF</span>
              . Validação aplicada no backend.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ─── SystemDatesEditor ────────────────────────────────────────────────────────

const SYSTEM_DATE_FIELDS: [keyof TimeSlots, string][] = [
  ["registrationStart", "Início das Inscrições"],
  ["registrationEnd", "Fim das Inscrições"],
  ["nominationsStart", "Início das Nomeações"],
  ["nominationsEnd", "Fim das Nomeações"],
  ["votesStart", "Início das Votações"],
  ["votesEnd", "Fim das Votações"],
  ["galaStart", "Início do Jantar de Gala"],
];

function SystemDatesEditor() {
  const { time } = useTime();
  const toast = useAppToast();
  const [edits, setEdits] = useState<Partial<Record<keyof TimeSlots, string>>>(
    {},
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!time) return;
    const initial: Partial<Record<keyof TimeSlots, string>> = {};
    for (const [field] of SYSTEM_DATE_FIELDS) {
      const iso = (time as unknown as Record<string, string>)[field];
      initial[field] = iso ? utcIsoToLocalInput(iso) : "";
    }
    setEdits(initial);
    setDirty(false);
  }, [time]);

  const handleChange = (field: keyof TimeSlots, value: string) => {
    setEdits((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const utcEdits = Object.fromEntries(
        Object.entries(edits).map(([k, v]) => [k, v ? localInputToUtcIso(v) : v]),
      );
      await GalaService.time.editTimeSlots(utcEdits);
      setDirty(false);
      toast.success("Datas guardadas.");
    } catch {
      toast.error("Erro ao guardar datas. Verifica as permissões.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SYSTEM_DATE_FIELDS.map(([field, label]) => (
          <Field key={field} label={label}>
            <DateTimeInput
              value={edits[field] ?? ""}
              onChange={(v) => handleChange(field, v)}
            />
          </Field>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="rounded-full bg-dark-gold px-5 py-1.5 text-sm font-semibold text-black transition hover:bg-yellow-600 disabled:opacity-40"
        >
          {saving ? "A guardar..." : "Guardar datas"}
        </button>
      </div>
    </div>
  );
}

// ─── LimitsEditor ─────────────────────────────────────────────────────────────

function LimitsEditor() {
  const { limits, refresh } = useLimits();
  const [maxRegistrations, setMaxRegistrations] = useState(0);
  const [maxBusSeats, setMaxBusSeats] = useState(0);

  useEffect(() => {
    if (!limits) return;
    setMaxRegistrations(limits.maxRegistrations ?? 0);
    setMaxBusSeats(limits.maxBusSeats ?? 0);
  }, [limits]);

  const saveField = (
    field: "maxRegistrations" | "maxBusSeats",
    value: number,
  ) => {
    GalaService.limits.editLimits({ [field]: value }).then(refresh);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Limite de inscrições">
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={maxRegistrations || ""}
            onChange={(e) => setMaxRegistrations(Number(e.target.value))}
            className={`flex-1 ${INPUT_CLS}`}
          />
          <button
            type="button"
            onClick={() => saveField("maxRegistrations", maxRegistrations)}
            className="shrink-0 rounded-lg border border-dark-gold/40 px-3 py-1.5 text-xs font-semibold text-dark-gold transition hover:bg-dark-gold/10"
          >
            Guardar
          </button>
        </div>
      </Field>
      <Field label="Lugares de autocarro">
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            value={maxBusSeats || ""}
            onChange={(e) => setMaxBusSeats(Number(e.target.value))}
            className={`flex-1 ${INPUT_CLS}`}
          />
          <button
            type="button"
            onClick={() => saveField("maxBusSeats", maxBusSeats)}
            className="shrink-0 rounded-lg border border-dark-gold/40 px-3 py-1.5 text-xs font-semibold text-dark-gold transition hover:bg-dark-gold/10"
          >
            Guardar
          </button>
        </div>
      </Field>
    </div>
  );
}
