import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCopy, faCheck, faTrash, faChair,
  faUsers, faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import GalaService from "@/services/GalaService";
import useTables from "@/hooks/tableHooks/useTables";
import useTime from "@/hooks/timeHooks/useTime";
import useLimits from "@/hooks/useLimits";
import VisualTable from "@/components/Table/VisualTable";
import { useAppToast } from "@/components/ui/Toast";
import { extractApiError } from "@/utils/apiError";
import useNEIUser from "@/hooks/useNEIUser";
import {
  Field, NumberInput, DateTimeInput, Section,
} from "./components/AdminUI";

// ─── Period control ───────────────────────────────────────────────────────────

function PeriodEditor() {
  const { time } = useTime();
  const toast = useAppToast();
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!time) return;
    setOpeningTime(time.tablesStart?.slice(0, 16) ?? "");
    setClosingTime(time.tablesEnd?.slice(0, 16) ?? "");
    setDirty(false);
  }, [time]);

  const status = () => {
    if (!openingTime || !closingTime) return "";
    const now = new Date();
    if (now < new Date(openingTime)) return "Por abrir";
    if (now <= new Date(closingTime)) return "Aberto";
    return "Fechado";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await GalaService.time.editTimeSlots({ tablesStart: openingTime, tablesEnd: closingTime });
      setDirty(false);
      toast.success("Período guardado.");
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao guardar."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Abertura">
          <DateTimeInput value={openingTime} onChange={(v) => { setOpeningTime(v); setDirty(true); }} />
        </Field>
        <Field label="Encerramento">
          <DateTimeInput value={closingTime} onChange={(v) => { setClosingTime(v); setDirty(true); }} />
        </Field>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/40">{status()}</span>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="rounded-full bg-dark-gold px-5 py-1.5 text-sm font-semibold text-black transition hover:bg-yellow-600 disabled:opacity-40"
        >
          {saving ? "A guardar..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}

// ─── Max tables limit ─────────────────────────────────────────────────────────

function MaxTablesEditor() {
  const { limits, refresh } = useLimits();
  const [value, setValue] = useState(0);
  const toast = useAppToast();

  useEffect(() => {
    if (limits) setValue(limits.maxTablesCount ?? 0);
  }, [limits]);

  const save = async () => {
    try {
      await GalaService.limits.editLimits({ maxTablesCount: value });
      refresh();
      toast.success("Limite atualizado.");
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao guardar."));
    }
  };

  return (
    <div className="flex gap-2">
      <NumberInput value={value} onChange={setValue} min={0} />
      <button
        type="button"
        onClick={save}
        className="shrink-0 rounded-lg border border-dark-gold/40 px-4 py-2 text-xs font-semibold text-dark-gold transition hover:bg-dark-gold/10"
      >
        Guardar
      </button>
    </div>
  );
}

// ─── Member row with resolved name ───────────────────────────────────────────

function MemberRow({
  person,
  isHead,
  onRemove,
}: {
  readonly person: Person;
  readonly isHead: boolean;
  readonly onRemove: () => void;
}) {
  const { neiUser } = useNEIUser(person.id);
  const displayName = neiUser ? `${neiUser.name} ${neiUser.surname}` : `#${person.id}`;

  return (
    <div className="flex items-center justify-between rounded-lg bg-white/4 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        {person.confirmed && <FontAwesomeIcon icon={faCircleCheck} className="text-xs text-emerald-400/60" />}
        <span className="truncate text-xs text-white/70">{displayName}</span>
        {isHead && (
          <span className="shrink-0 rounded-full bg-dark-gold/20 px-2 py-0.5 text-[0.5rem] font-bold uppercase tracking-widest text-dark-gold">
            Responsável
          </span>
        )}
        {person.companions.length > 0 && (
          <span className="shrink-0 text-[0.6rem] text-white/30">+{person.companions.length} acomp.</span>
        )}
      </div>
      {!isHead && (
        <button
          type="button"
          onClick={onRemove}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-red-400/40 transition hover:bg-red-500/10 hover:text-red-400"
          title="Remover da mesa"
        >
          <FontAwesomeIcon icon={faTrash} className="text-[0.6rem]" />
        </button>
      )}
    </div>
  );
}

// ─── Table card (admin) ───────────────────────────────────────────────────────

function TableAdminCard({ table, onRemoveMember }: {
  readonly table: Table;
  readonly onRemoveMember: (tableId: number, userId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const occupied = table.persons.reduce((acc, p) => acc + 1 + (p.companions?.length ?? 0), 0);

  const copyInviteLink = () => {
    if (!table.invite_token) return;
    const url = `${window.location.origin}/register?table=${table._id}&token=${table.invite_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 transition-colors hover:border-white/12">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] font-bold uppercase tracking-widest text-white/25">#{table._id}</span>
          <span className="font-gala text-sm font-semibold text-white/80">{table.name || "Sem nome"}</span>
          {table.photo_url && (
            <img
              src={table.photo_url}
              alt="foto da mesa"
              className="h-5 w-5 rounded-full object-cover ring-1 ring-white/10"
            />
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">
            <FontAwesomeIcon icon={faUsers} className="mr-1.5" />
            {occupied}/{table.seats}
          </span>
          <div className={`h-1.5 w-1.5 rounded-full ${occupied >= table.seats ? "bg-red-400/60" : "bg-emerald-400/60"}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/6 px-4 pb-4 pt-3 flex flex-col gap-3">
          {/* Visual + photo + invite */}
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <VisualTable table={table} alwaysVisible className="p-6" />
            </div>
            <div className="flex flex-col gap-2 pt-1">
              {table.photo_url && (
                <img
                  src={table.photo_url}
                  alt="foto de grupo"
                  className="h-20 w-20 rounded-xl object-cover ring-1 ring-white/10"
                />
              )}
              {table.invite_token && (
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[0.6rem] font-semibold text-white/40 transition hover:border-light-gold/40 hover:text-light-gold"
                >
                  <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-[0.55rem]" />
                  {copied ? "Copiado!" : "Copiar link convite"}
                </button>
              )}
            </div>
          </div>

          {/* Members */}
          {table.persons.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[0.55rem] font-bold uppercase tracking-widest text-white/25">Membros</p>
              {table.persons.map((p) => (
                <MemberRow
                  key={p.id}
                  person={p}
                  isHead={table.head === p.id}
                  onRemove={() => onRemoveMember(table._id, p.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { readonly label: string; readonly value: string; readonly sub?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4">
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white/90">{value}</p>
      {sub && <p className="mt-0.5 text-[0.6rem] text-white/25">{sub}</p>}
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function TablesAdmin() {
  const { tables, mutate: refresh } = useTables();
  const { limits } = useLimits();
  const toast = useAppToast();

  const totalOccupied = tables.reduce(
    (acc, t) => acc + t.persons.reduce((s, p) => s + 1 + (p.companions?.length ?? 0), 0), 0,
  );
  const fullTables = tables.filter((t) => {
    const occ = t.persons.reduce((s, p) => s + 1 + (p.companions?.length ?? 0), 0);
    return occ >= t.seats;
  }).length;

  const handleRemoveMember = async (tableId: number, userId: number) => {
    try {
      await GalaService.table.tableRemoveUser(tableId, userId);
      refresh();
      toast.success("Membro removido.");
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao remover membro."));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Mesas criadas" value={String(tables.length)} sub={limits?.maxTablesCount ? `/ ${limits.maxTablesCount} máx.` : undefined} />
        <StatCard label="Lugares ocupados" value={String(totalOccupied)} />
        <StatCard label="Mesas cheias" value={String(fullTables)} />
        <StatCard label="Mesas com espaço" value={String(tables.length - fullTables)} />
      </div>

      {/* Config sections */}
      <Section title="Período de escolha de mesa" defaultOpen>
        <PeriodEditor />
      </Section>

      <Section title="Limite de mesas">
        <Field label="Número máximo de mesas que podem ser criadas">
          <MaxTablesEditor />
        </Field>
      </Section>

      {/* Table list */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-gala text-base font-semibold text-white/70">
            Mesas ({tables.length})
          </h2>
          <div className="flex items-center gap-3 text-[0.6rem] text-white/25">
            <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/60" /> Disponível</span>
            <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400/60" /> Cheia</span>
          </div>
        </div>

        {tables.length === 0 ? (
          <div className="rounded-xl border border-white/6 bg-white/2 py-12 text-center">
            <FontAwesomeIcon icon={faChair} className="mb-3 text-2xl text-white/10" />
            <p className="text-sm text-white/25">Nenhuma mesa criada ainda.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tables.map((table) => (
              <TableAdminCard
                key={table._id}
                table={table}
                onRemoveMember={handleRemoveMember}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
