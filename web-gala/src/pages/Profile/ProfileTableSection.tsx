import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import useTables from "@/hooks/tableHooks/useTables";
import useTable from "@/hooks/tableHooks/useTable";
import useLimits from "@/hooks/useLimits";
import Table from "@/components/Table";
import VisualTable from "@/components/Table/VisualTable";
import GuestList from "@/components/TableModal/GuestList";
import useNEIUser from "@/hooks/useNEIUser";
import { RegistrationConfig } from "@/config/registrationConfig";

const DEFAULT_SEATS = 10;

interface Props {
  readonly config: RegistrationConfig;
}

function buildSlots(tables: Table[], maxCount: number): Array<Table | null> {
  const sorted = [...tables].sort((a, b) => a._id - b._id);
  const slots: Array<Table | null> = Array(maxCount).fill(null);
  sorted.forEach((t, i) => {
    if (i < maxCount) slots[i] = t;
  });
  return slots;
}

export default function ProfileTableSection({ config }: Readonly<Props>) {
  const { tables } = useTables();
  const { limits } = useLimits();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const maxCount = limits?.maxTablesCount ?? tables.length;
  const slots = buildSlots(tables, maxCount);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-white/40">
        Prazo para escolha de mesa:{" "}
        <span className="font-semibold text-white/60">{config.tableDeadlineDate}</span>
      </p>

      {selectedId !== null && (
        <TableDetail tableId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
        {slots.map((table, i) =>
          table ? (
            <button
              key={table._id}
              type="button"
              onClick={() => setSelectedId(selectedId === table._id ? null : table._id)}
              className={[
                "rounded-xl border p-3 text-left transition-all hover:border-white/20",
                selectedId === table._id
                  ? "border-light-gold/40 bg-light-gold/5"
                  : "border-white/8 bg-white/3",
              ].join(" ")}
            >
              <Table table={table} />
            </button>
          ) : (
            <EmptySlot key={`empty-${i}`} slotNumber={i + 1} />
          )
        )}
      </div>

      {maxCount === 0 && (
        <p className="text-sm text-white/35">Nenhuma mesa disponível de momento.</p>
      )}
    </div>
  );
}

function EmptySlot({ slotNumber }: Readonly<{ slotNumber: number }>) {
  const placeholder: Table = {
    _id: -slotNumber,
    name: null,
    head: null,
    seats: DEFAULT_SEATS,
    persons: [],
  };

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-white/2 p-3 opacity-40">
      <span className="text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
        Mesa #{slotNumber}
      </span>
      <div className="pointer-events-none">
        <VisualTable table={placeholder} alwaysVisible className="p-8" />
      </div>
      <span className="text-xs text-white/25">Livre</span>
    </div>
  );
}

function TableDetail({ tableId, onClose }: Readonly<{ tableId: number; onClose: () => void }>) {
  const { table, isLoading } = useTable(tableId);
  const { neiUser } = useNEIUser(table?.head ?? null);

  if (isLoading || !table) return null;

  const occupied = table.persons.reduce((acc, p) => acc + 1 + p.companions.length, 0);

  return (
    <div className="rounded-xl border border-light-gold/20 bg-white/4 p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="font-gala text-lg font-bold text-white/85">
            {table.name || "Mesa sem nome"}
          </h3>
          {neiUser && (
            <p className="text-xs text-white/40">
              Mesa de {neiUser.name} {neiUser.surname}
            </p>
          )}
          <p className="mt-1 text-xs text-white/30">
            {occupied} / {table.seats} lugares ocupados
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/8 hover:text-white/60"
        >
          <FontAwesomeIcon icon={faXmark} className="text-sm" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex items-center justify-center">
          <VisualTable table={table} alwaysVisible />
        </div>
        <div className="flex flex-col gap-4">
          <GuestList persons={table.persons} />
          <Link
            to={`/reserve/${table._id}`}
            className="flex items-center justify-between rounded-lg border border-light-gold/30 px-4 py-3 text-sm font-semibold text-light-gold/70 transition hover:border-light-gold/60 hover:text-light-gold"
          >
            Gerir mesa
            <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
          </Link>
        </div>
      </div>
    </div>
  );
}
