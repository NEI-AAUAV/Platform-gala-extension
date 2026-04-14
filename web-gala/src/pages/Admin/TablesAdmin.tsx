import { useEffect, useState } from "react";
import GalaService from "@/services/GalaService";
import Input from "@/components/Input";
import useTables from "@/hooks/tableHooks/useTables";
import useTime from "@/hooks/timeHooks/useTime";
import useLimits from "@/hooks/useLimits";
import VisualTable from "@/components/Table/VisualTable";
import useNEIUser from "@/hooks/useNEIUser";

function TimeSlots() {
  const { time } = useTime();
  const [openingTime, setOpeningTime] = useState<string | undefined>();
  const [closingTime, setClosingTime] = useState<string | undefined>();
  const [notDirty, setNotDirty] = useState(false);

  useEffect(() => {
    setOpeningTime(time?.tablesStart.slice(0, 16));
    setClosingTime(time?.tablesEnd.slice(0, 16));
  }, [time]);

  useEffect(() => {
    setNotDirty(
      (time?.tablesStart?.startsWith(openingTime || "") &&
        time?.tablesEnd?.startsWith(closingTime || "")) ??
        false,
    );
  }, [openingTime, closingTime, time]);

  const status = () => {
    if (!openingTime || !closingTime) return "";
    const now = new Date();
    now.setHours(now.getHours() - 1);
    if (now < new Date(openingTime)) return "Por abrir";
    if (now <= new Date(closingTime)) return "Aberto";
    return "Fechado";
  };

  const handleSave = () => {
    if (!time) return;
    GalaService.time
      .editTimeSlots({ tablesStart: openingTime, tablesEnd: closingTime })
      .then((res) => {
        setNotDirty(
          (res.tablesStart?.startsWith(openingTime || "") &&
            res.tablesEnd?.startsWith(closingTime || "")) ??
            false,
        );
        if (time) {
          time.tablesStart = openingTime || "";
          time.tablesEnd = closingTime || "";
        }
      });
  };

  return (
    <form className="flex flex-col gap-3 rounded-lg border border-dark-gold/20 bg-dark-gold/5 p-4">
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm text-dark-gold/80">Abrir</span>
        <Input
          type="datetime-local"
          className="w-48 bg-transparent px-3 py-1 text-sm text-dark-gold border border-dark-gold/20"
          value={openingTime || ""}
          onChange={(e) => setOpeningTime(e.target.value)}
        />
      </label>
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm text-dark-gold/80">Fechar</span>
        <Input
          type="datetime-local"
          className="w-48 bg-transparent px-3 py-1 text-sm text-dark-gold border border-dark-gold/20"
          value={closingTime || ""}
          onChange={(e) => setClosingTime(e.target.value)}
        />
      </label>
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm font-bold text-dark-gold/60">{status()}</span>
        <button
          className="rounded-full bg-dark-gold px-4 py-1 text-sm font-semibold text-black transition-colors hover:bg-yellow-600 disabled:opacity-50"
          onClick={handleSave}
          disabled={notDirty}
          type="button"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}

function TablesCountLimit() {
  const { limits, refresh } = useLimits();
  const [maxTablesCount, setMaxTablesCount] = useState<number>(0);

  useEffect(() => {
    if (limits) setMaxTablesCount(limits.maxTablesCount || 0);
  }, [limits]);

  function save() {
    if (limits?.maxTablesCount === maxTablesCount) return;
    GalaService.limits.editLimits({ maxTablesCount }).then(refresh);
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dark-gold/20 bg-dark-gold/5 p-4">
      <Input
        className="w-full bg-transparent px-3 py-1 text-dark-gold border border-dark-gold/20 placeholder:text-dark-gold/50"
        type="number"
        min={0}
        placeholder="Número máximo de mesas"
        onChange={(e) => {
          const num = Number.parseInt(e.target.value, 10);
          if (!Number.isNaN(num)) setMaxTablesCount(num);
        }}
        value={maxTablesCount || ""}
      />
      <button
        className="shrink-0 rounded-full bg-dark-gold px-4 py-1 font-semibold text-black hover:bg-yellow-600"
        type="button"
        onClick={save}
      >
        Atualizar
      </button>
    </div>
  );
}

function TableCard({ table }: { readonly table: Table }) {
  const { neiUser } = useNEIUser(table.head);
  const occupied = table.persons.reduce(
    (acc, p) => acc + 1 + (p.companions?.length ?? 0),
    0,
  );

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dark-gold/20 bg-dark-gold/5 p-4">
      <span className="text-[0.6rem] font-bold uppercase tracking-widest text-dark-gold/40">
        Mesa #{table._id}
      </span>
      <h4 className="font-gala text-sm font-bold text-dark-gold">
        {table.name || "Sem nome"}
      </h4>
      {neiUser && (
        <p className="text-[0.65rem] text-dark-gold/50">
          {neiUser.name} {neiUser.surname}
        </p>
      )}
      <VisualTable table={table} alwaysVisible className="p-8" />
      <p className="text-xs text-dark-gold/60">
        {occupied} / {table.seats} lugares
      </p>
    </div>
  );
}

export default function TablesAdmin() {
  const { tables } = useTables();
  const { limits } = useLimits();

  const totalOccupied = tables.reduce(
    (acc, t) =>
      acc + t.persons.reduce((s, p) => s + 1 + (p.companions?.length ?? 0), 0),
    0,
  );

  return (
    <div className="flex flex-col gap-8">
      {/* ── Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat title="Mesas criadas" value={`${tables.length}`} sub={limits?.maxTablesCount ? `/ ${limits.maxTablesCount} máximo` : undefined} />
        <Stat title="Lugares ocupados" value={`${totalOccupied}`} />
        <Stat title="Mesas disponíveis" value={`${tables.filter(t => t.persons.length === 0).length}`} />
      </div>

      {/* ── Controls ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="font-gala text-xl font-bold text-dark-gold">
            Período de escolha de mesa
          </h2>
          <TimeSlots />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-gala text-xl font-bold text-dark-gold">
            Limite de mesas
          </h2>
          <p className="text-xs text-dark-gold/50">
            Define quantas mesas podem ser criadas pelos utilizadores.
          </p>
          <TablesCountLimit />
        </div>
      </div>

      {/* ── Tables grid ───────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <h2 className="font-gala text-xl font-bold text-dark-gold">
          Mesas ({tables.length})
        </h2>
        {tables.length === 0 ? (
          <p className="text-sm text-dark-gold/40">Nenhuma mesa criada ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {tables.map((table) => (
              <TableCard key={table._id} table={table} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ title, value, sub }: { readonly title: string; readonly value: string; readonly sub?: string }) {
  return (
    <div className="rounded-xl border border-dark-gold/20 bg-dark-gold/5 p-4">
      <span className="text-sm font-medium text-dark-gold/70">{title}</span>
      <div className="mt-2 text-2xl font-bold text-dark-gold">{value}</div>
      {sub && <p className="mt-0.5 text-xs text-dark-gold/40">{sub}</p>}
    </div>
  );
}
