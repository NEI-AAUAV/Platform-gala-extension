import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faRotateLeft, faChevronDown, faCheck, faCircleCheck, faHandDots, faSeedling, faEye, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { useRegistrationConfig } from "@/hooks/useRegistrationConfig";
import { MealOption, PaymentContact, PaymentMethod } from "@/config/registrationConfig";
import useTime from "@/hooks/timeHooks/useTime";
import GalaService from "@/services/GalaService";
import { type ReactNode } from "react";
import useLimits from "@/hooks/useLimits";
import { FrangoIcon } from "@/assets/icons";
import { useAppToast } from "@/components/ui/Toast";
import { extractApiError } from "@/utils/apiError";
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
          <div key={i} className="grid grid-cols-[4rem_1fr_1fr_2.5rem] gap-2">
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
  const [saved, setSaved] = useState(false);

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

      <Section title="1. Datas do Sistema" defaultOpen>
        <p className="text-xs text-white/40">
          Controla quando cada fase está aberta. As datas das mesas são geridas no separador <span className="text-white/60 font-semibold">Mesas</span>.
        </p>
        <SystemDatesEditor />
      </Section>

      <Section title="2. Informações do Evento">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Data do evento"><TextInput value={config.eventDate} onChange={(v) => save({ eventDate: v })} placeholder="Ex: 14 de junho de 2025" /></Field>
          <Field label="Horário"><TextInput value={config.eventTime} onChange={(v) => save({ eventTime: v })} placeholder="Ex: 20:00 – 02:00" /></Field>
          <Field label="Local"><TextInput value={config.eventLocation} onChange={(v) => save({ eventLocation: v })} /></Field>
          <Field label="Preço por pessoa (€)"><NumberInput value={config.eventPrice} onChange={(v) => save({ eventPrice: v })} min={0} /></Field>
        </div>
      </Section>

      <Section title="3. O que está incluído">
        <StringListEditor items={config.eventIncludes} onChange={(v) => save({ eventIncludes: v })} placeholder="Ex: Entradas" />
      </Section>

      <Section title="4. Regras do Evento">
        <StringListEditor items={config.eventRules} onChange={(v) => save({ eventRules: v })} placeholder="Ex: Inscrições limitadas." />
      </Section>

      <Section title="5. Transporte (Autocarro)">
        <Toggle enabled={config.busEnabled} onChange={(v) => save({ busEnabled: v })} label="Autocarro disponível (ida e volta)" />
        {config.busEnabled && (
          <Field label="Preço por pessoa (€ — 0 = incluído no preço)">
            <NumberInput value={config.busRoundTripPrice} onChange={(v) => save({ busRoundTripPrice: v })} />
          </Field>
        )}
      </Section>

      <Section title="6. Opções de Refeição">
        <MealOptionsEditor options={config.mealOptions} onChange={(v) => save({ mealOptions: v })} />
        <Toggle enabled={config.allergiesRequired} onChange={(v) => save({ allergiesRequired: v })} label="Alergias obrigatórias" />
      </Section>

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

      <Section title="8. Pagamento Faseado (Dual-Proof)">
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

      <Section title="9. Limites">
        <LimitsEditor />
      </Section>

      <Section title="10. Ferramentas de Exportação">
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

      <Section title="11. Segurança & Regras de Upload">
        <p className="text-xs text-white/40">
          Tamanho máximo: <span className="text-white/60 font-semibold">10 MB</span> por comprovativo. Formatos aceites: <span className="text-white/60 font-semibold">imagens e PDF</span>. Validação aplicada no backend.
        </p>
      </Section>

      <Section title="12. Inscritos e Pagamentos">
        <UsersTable />
      </Section>
    </div>
  );
}

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
  const [edits, setEdits] = useState<Partial<Record<keyof TimeSlots, string>>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!time) return;
    const initial: Partial<Record<keyof TimeSlots, string>> = {};
    for (const [field] of SYSTEM_DATE_FIELDS) {
      initial[field] = (time as unknown as Record<string, string>)[field]?.slice(0, 16) ?? "";
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
      await GalaService.time.editTimeSlots(edits);
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

function LimitsEditor() {
  const { limits, refresh } = useLimits();
  const [maxRegistrations, setMaxRegistrations] = useState(0);
  const [maxBusSeats, setMaxBusSeats] = useState(0);

  useEffect(() => {
    if (!limits) return;
    setMaxRegistrations(limits.maxRegistrations ?? 0);
    setMaxBusSeats(limits.maxBusSeats ?? 0);
  }, [limits]);

  const saveField = (field: "maxRegistrations" | "maxBusSeats", value: number) => {
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

const orange = { color: "#DD8500" };
const green = { color: "#198754" };
const red = { color: "#DC3545" };

const dishIcon = new Map([
  ["NOR", <FrangoIcon key="NOR" style={orange} />],
  ["VEG", <FontAwesomeIcon key="VEG" icon={faSeedling} style={green} />],
]);

const busLabel: Record<string, string> = {
  ROUND_TRIP: "Ida e volta",
  ONE_WAY: "Só ida",
  NONE: "Sem autocarro",
};

type RegistrationDetailProps = {
  user: User;
  onConfirmPayment: () => void;
  onClose: () => void;
};

function RegistrationDetail({ user, onConfirmPayment, onClose }: RegistrationDetailProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{user.name}</h2>
          <p className="text-xs text-white/40">{user.email}</p>
        </div>
        <button type="button" onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors text-lg">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <DetailRow label="NMec" value={String(user.nmec)} />
        <DetailRow label="Matrícula" value={user.matriculation ? `${user.matriculation}º ano` : "Alumni / Outro"} />
        <DetailRow label="Telefone" value={user.phone ?? "—"} />
        <DetailRow label="Autocarro" value={busLabel[user.bus_option] ?? user.bus_option} />
        <DetailRow label="Prato" value={user.meal_option ?? "—"} icon={dishIcon.get(user.meal_option ?? "")} />
        <DetailRow label="Alergias" value={user.food_allergies || "Nenhuma"} />
      </div>

      {user.companions.length > 0 && (
        <div>
          <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
            Acompanhantes ({user.companions.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {user.companions.map((c, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-white/4 px-3 py-2 text-sm">
                <span className="text-white/60">#{i + 1}</span>
                <span className="flex items-center gap-1.5">{dishIcon.get(c.dish)}</span>
                {c.allergies && (
                  <span className="flex items-center gap-1 text-xs text-red-400/70">
                    <FontAwesomeIcon icon={faHandDots} /> {c.allergies}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-widest text-white/30">Pagamento</p>
        <div className="flex flex-col gap-2">
          <PaymentProofRow label="Comprovativo Fase 1" url={user.payment_proof_url} />
          {user.phased_payment && (
            <PaymentProofRow label="Comprovativo Fase 2" url={user.payment_proof_url_phase2} />
          )}
          {!user.has_payed && (
            <button
              type="button"
              onClick={onConfirmPayment}
              className="mt-2 w-full rounded-xl bg-dark-gold py-2.5 text-sm font-bold text-black transition hover:bg-yellow-600"
            >
              <FontAwesomeIcon icon={faCircleCheck} className="mr-2" />
              Confirmar Pagamento
            </button>
          )}
          {user.has_payed && (
            <p className="flex items-center gap-2 text-sm text-emerald-400/80">
              <FontAwesomeIcon icon={faCircleCheck} /> Pagamento confirmado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-white/4 px-3 py-2">
      <span className="text-[0.55rem] font-bold uppercase tracking-widest text-white/30">{label}</span>
      <span className="flex items-center gap-1.5 text-sm text-white/80">{icon}{value}</span>
    </div>
  );
}

function PaymentProofRow({ label, url }: { label: string; url: string | null }) {
  if (!url) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-white/4 px-3 py-2">
        <span className="text-xs text-white/40">{label}</span>
        <span className="text-[0.6rem] text-white/25">Não enviado</span>
      </div>
    );
  }

  const isPdf = url.toLowerCase().includes(".pdf") || url.toLowerCase().includes("pdf");

  return (
    <div className="flex items-center justify-between rounded-lg bg-white/4 px-3 py-2">
      <span className="text-xs text-white/60">{label}</span>
      <div className="flex items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-full border border-dark-gold/40 px-3 py-1 text-[0.6rem] font-bold text-dark-gold transition hover:bg-dark-gold/10"
        >
          <FontAwesomeIcon icon={isPdf ? faExternalLinkAlt : faEye} />
          {isPdf ? "Abrir PDF" : "Ver imagem"}
        </a>
      </div>
    </div>
  );
}

function UsersTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const detailRef = useRef<HTMLDialogElement>(null);
  const toast = useAppToast();

  const loadUsers = () => GalaService.admin.listRegistrations().then(setUsers).catch(() => {});

  useEffect(() => { loadUsers(); }, []);

  const openDetail = (user: User) => {
    setSelectedUser(user);
    detailRef.current?.showModal();
  };

  const handleConfirmPayment = async () => {
    if (!selectedUser) return;
    try {
      await GalaService.admin.confirmPayment(selectedUser._id);
      toast.success("Pagamento confirmado!");
      detailRef.current?.close();
      loadUsers();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao confirmar pagamento."));
    }
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full text-left text-sm text-white/70">
          <thead className="border-b border-white/6 text-[0.6rem] uppercase tracking-widest text-white/30">
            <tr>
              <th className="px-4 py-3">NMec</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Matrícula</th>
              <th className="px-4 py-3">Prato</th>
              <th className="px-4 py-3">Pagamento</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {users.map((user) => (
              <tr key={user._id} className="group transition-colors hover:bg-white/3">
                <td className="px-4 py-3 font-medium">{user.nmec}</td>
                <td className="px-4 py-3">
                  <div>
                    <p>{user.name}</p>
                    <p className="text-xs text-white/35">{user.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">{user.matriculation ? `${user.matriculation}º ano` : "Outro"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {dishIcon.get(user.meal_option ?? "")}
                    {user.food_allergies && (
                      <FontAwesomeIcon icon={faHandDots} style={red} title={user.food_allergies} />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {user.has_payed ? (
                    <span className="flex items-center gap-1.5 text-emerald-400/80">
                      <FontAwesomeIcon icon={faCircleCheck} className="text-xs" /> Pago
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-yellow-400/70">
                      <FontAwesomeIcon icon={faCheck} className="text-xs" />
                      {user.payment_proof_url ? "Comprovativo enviado" : "A aguardar"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => openDetail(user)}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[0.6rem] font-semibold text-white/40 opacity-0 transition hover:border-white/30 hover:text-white/70 group-hover:opacity-100"
                  >
                    <FontAwesomeIcon icon={faEye} /> Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-white/30">Nenhum inscrito ainda.</p>
        )}
      </div>

      <dialog
        ref={detailRef}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f0f] p-8 text-white shadow-2xl backdrop:bg-black/80"
      >
        {selectedUser && (
          <RegistrationDetail
            user={selectedUser}
            onConfirmPayment={handleConfirmPayment}
            onClose={() => detailRef.current?.close()}
          />
        )}
      </dialog>
    </>
  );
}
