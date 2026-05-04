import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faChevronRight, faBell, faCheck } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import useTables from "@/hooks/tableHooks/useTables";
import useTable from "@/hooks/tableHooks/useTable";
import useLimits from "@/hooks/useLimits";
import useTime, { TimeStatus } from "@/hooks/timeHooks/useTime";
import useMyInvites from "@/hooks/tableHooks/useMyInvites";
import Table from "@/components/Table";
import VisualTable from "@/components/Table/VisualTable";
import GuestList from "@/components/TableModal/GuestList";
import useNEIUser from "@/hooks/useNEIUser";
import { formatDateTimePT } from "@/utils/formatDate";
import GalaService from "@/services/GalaService";
import { useAppToast } from "@/components/ui/Toast";
import { extractApiError } from "@/utils/apiError";

const DEFAULT_SEATS = 10;

function buildSlots(tables: Table[], maxCount: number): Array<Table | null> {
  const sorted = [...tables].sort((a, b) => a._id - b._id);
  const slots: Array<Table | null> = new Array(maxCount).fill(null);
  sorted.forEach((t, i) => {
    if (i < maxCount) slots[i] = t;
  });
  return slots;
}

// ---------------------------------------------------------------------------
// Pending invites banner
// ---------------------------------------------------------------------------

function PendingInvitesBanner({ invites, onAccepted }: Readonly<{
  invites: Table[];
  onAccepted: () => void;
}>) {
  const toast = useAppToast();
  const { mutate } = useMyInvites();
  const { mutate: mutateAllTables } = useTables();

  if (invites.length === 0) return null;

  const accept = async (tableId: number) => {
    try {
      await GalaService.table.acceptInvite(tableId, {});
      toast.success("Entraste na mesa!");
      mutate();
      mutateAllTables();
      onAccepted();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao aceitar convite."));
    }
  };

  const decline = async (tableId: number) => {
    try {
      // We need our own user ID — fetch via session user
      const me = await GalaService.user.getSessionUser();
      await GalaService.table.revokeInvite(tableId, me._id);
      toast.success("Convite recusado.");
      mutate();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao recusar convite."));
    }
  };

  return (
    <div className="rounded-xl border border-light-gold/25 bg-light-gold/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FontAwesomeIcon icon={faBell} className="text-light-gold" />
        <p className="text-xs font-bold text-light-gold">
          {invites.length === 1 ? "Tens 1 convite pendente" : `Tens ${invites.length} convites pendentes`}
        </p>
      </div>
      <div className="space-y-2">
        {invites.map((t) => (
          <InviteRow key={t._id} table={t} onAccept={accept} onDecline={decline} />
        ))}
      </div>
    </div>
  );
}

function InviteRow({
  table,
  onAccept,
  onDecline,
}: Readonly<{
  table: Table;
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
}>) {
  const { neiUser } = useNEIUser(table.head ?? null);
  const occupied = table.persons.reduce((acc, p) => acc + 1 + p.companions.length, 0);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white/85">
          {table.name || `Mesa #${table._id}`}
        </p>
        <p className="text-[0.6rem] text-white/35">
          {neiUser ? `Por ${neiUser.name} ${neiUser.surname}` : `Mesa #${table._id}`}
          {" · "}{occupied}/{table.seats} lugares
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => onDecline(table._id)}
          className="rounded-full border border-white/15 px-3 py-1.5 text-[0.65rem] font-bold text-white/40 transition hover:border-red-400/40 hover:text-red-400"
        >
          Recusar
        </button>
        <button
          type="button"
          onClick={() => onAccept(table._id)}
          className="flex items-center gap-1.5 rounded-full border border-light-gold/50 bg-light-gold/10 px-3 py-1.5 text-[0.65rem] font-bold text-light-gold transition hover:bg-light-gold/20"
        >
          <FontAwesomeIcon icon={faCheck} className="text-[0.5rem]" />
          Aceitar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ProfileTableSection() {
  const { tables, mutate: mutateAllTables } = useTables();
  const { limits } = useLimits();
  const { time } = useTime();
  const { invites, mutate: mutateInvites } = useMyInvites();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const maxCount = limits?.maxTablesCount ?? tables.length;
  const slots = buildSlots(tables, maxCount);
  const tablePeriodClosed = time?.tablesStatus === TimeStatus.CLOSED;
  const tableDeadlineLabel = time ? formatDateTimePT(time.tablesEnd) : "A anunciar";

  const handleAccepted = () => {
    mutateAllTables();
    mutateInvites();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-white/40">
        Prazo para escolha de mesa:{" "}
        <span className={["font-semibold", tablePeriodClosed ? "text-red-400/80" : "text-white/60"].join(" ")}>
          {tableDeadlineLabel}
        </span>
        {tablePeriodClosed && <span className="ml-2 text-red-400/70">— Período encerrado</span>}
      </p>

      {tablePeriodClosed && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-xs text-red-400/70">
            O período de escolha e alteração de mesa já terminou. Para resolver qualquer situação, contacta a organização.
          </p>
        </div>
      )}

      {/* Pending invites */}
      {!tablePeriodClosed && (
        <PendingInvitesBanner invites={invites} onAccepted={handleAccepted} />
      )}

      {selectedId !== null && (
        <TableDetail tableId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
        {slots.map((table, i) => {
          const slotKey = table ? `table-${table._id}` : `empty-slot-${i}`;
          return table ? (
            <button
              key={slotKey}
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
            <EmptySlot key={slotKey} slotNumber={i + 1} />
          );
        })}
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
