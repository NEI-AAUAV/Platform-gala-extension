import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faUsers,
  faPlus,
  faCheck,
  faInfoCircle,
  faBell,
} from "@fortawesome/free-solid-svg-icons";
import { RegistrationConfig } from "@/config/registrationConfig";
import { WizardData } from "@/hooks/useWizardState";
import useTables from "@/hooks/tableHooks/useTables";
import useLimits from "@/hooks/useLimits";
import useMyInvites from "@/hooks/tableHooks/useMyInvites";
import VisualTable from "@/components/Table/VisualTable";
import useNEIUser from "@/hooks/useNEIUser";

interface Props {
  readonly config: RegistrationConfig;
  readonly data: WizardData;
  readonly onUpdate: (updates: Partial<WizardData>) => void;
  readonly onNext: () => void;
  readonly onBack: () => void;
}

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
// Pending invite row inside Step 5
// ---------------------------------------------------------------------------

function InviteCard({
  table,
  isSelected,
  onSelect,
}: Readonly<{
  table: Table;
  isSelected: boolean;
  onSelect: () => void;
}>) {
  const { neiUser } = useNEIUser(table.head ?? null);
  const occupied = table.persons.reduce(
    (a, p) => a + 1 + p.companions.length,
    0,
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all",
        isSelected
          ? "border-light-gold bg-light-gold/10 ring-1 ring-light-gold"
          : "border-light-gold/20 bg-light-gold/5 hover:border-light-gold/40",
      ].join(" ")}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-bold text-light-gold">
          <FontAwesomeIcon icon={faBell} className="text-xs" />
          {table.name || `Mesa #${table._id}`}
        </p>
        <p className="mt-0.5 text-[0.6rem] text-white/40">
          Convite de{" "}
          {neiUser ? `${neiUser.name} ${neiUser.surname}` : `#${table.head}`}
          {" · "}
          {occupied}/{table.seats} lugares ocupados
        </p>
      </div>
      {isSelected && (
        <FontAwesomeIcon icon={faCheck} className="shrink-0 text-light-gold" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Step5Table component
// ---------------------------------------------------------------------------

export default function Step5Table({
  data,
  onUpdate,
  onNext,
  onBack,
}: Readonly<Props>) {
  const { tables, isLoading } = useTables();
  const { limits } = useLimits();
  const { invites } = useMyInvites();
  const [searchTerm, setSearchTerm] = useState("");
  const [newTableName, setNewTableName] = useState("");

  useEffect(() => {
    if (data.tableId === "new" && !newTableName) {
      setNewTableName("");
    }
  }, [data.tableId]);

  const maxCount = limits?.maxTablesCount ?? tables.length;
  const slots = useMemo(() => buildSlots(tables, maxCount), [tables, maxCount]);

  const filteredSlots = useMemo(() => {
    if (!searchTerm) return slots;
    return slots.map((t) => {
      if (!t) return null;
      return t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t._id.toString().includes(searchTerm)
        ? t
        : null;
    });
  }, [slots, searchTerm]);

  const selectedTable =
    data.tableId && data.tableId !== "new" && data.tableId !== "none"
      ? tables.find((t) => String(t._id) === data.tableId) ?? null
      : null;

  const handleSelectTable = (id: number) => {
    onUpdate({ tableId: String(id), tableRole: "member" });
  };

  const handleSelectInvite = (id: number) => {
    onUpdate({ tableId: String(id), tableRole: "invited" });
  };

  const handleCreateNew = () => {
    onUpdate({ tableId: "new", tableRole: "owner" });
  };

  const handleSkip = () => {
    onUpdate({ tableId: "none", tableRole: null });
  };

  const handleNext = () => {
    if (data.tableId === "new") {
      onUpdate({ tableName: newTableName || undefined });
    }
    onNext();
  };

  const canContinue = data.tableId !== null;

  // Filter invites so they don't also show in the main grid
  const inviteTableIds = new Set(invites.map((t) => t._id));

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-6"
    >
      <p className="text-sm text-white/50">
        Escolhe onde te queres sentar. Podes juntar-te a uma mesa existente,
        criar uma nova para o teu grupo, ou continuar sem mesa.
      </p>

      {/* Pending invites section */}
      {invites.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2"
        >
          <p className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-light-gold/70">
            <FontAwesomeIcon icon={faBell} />
            {invites.length === 1
              ? "Tens 1 convite pendente"
              : `Tens ${invites.length} convites pendentes`}
          </p>
          {invites.map((t) => (
            <InviteCard
              key={t._id}
              table={t}
              isSelected={data.tableId === String(t._id)}
              onSelect={() => handleSelectInvite(t._id)}
            />
          ))}
          <p className="text-[0.6rem] text-white/25">
            Ao aceitares um convite és adicionado automaticamente à mesa.
          </p>
        </motion.div>
      )}

      {/* Search + action bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
          />
          <input
            type="text"
            placeholder="Procurar mesa por nome ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-light-gold/50"
          />
        </div>
        <button
          type="button"
          onClick={handleCreateNew}
          className={[
            "flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition-all",
            data.tableId === "new"
              ? "border-light-gold bg-light-gold text-black"
              : "border-light-gold/40 text-light-gold hover:bg-light-gold/10",
          ].join(" ")}
        >
          <FontAwesomeIcon icon={faPlus} /> Criar Nova Mesa
        </button>
      </div>

      {/* New table name input */}
      {data.tableId === "new" && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 rounded-xl border border-light-gold/30 bg-light-gold/5 p-5"
        >
          <p className="text-xs font-semibold text-light-gold/70">
            Dá um nome à tua mesa. Poderás convidar amigos depois de concluíres
            a inscrição na secção de Mesas do teu perfil.
          </p>
          <input
            type="text"
            placeholder="Ex: Os Fixolas, Mesa A, ..."
            maxLength={20}
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            className="border-white/15 rounded-lg border bg-[#1c1c1e] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-light-gold/50"
          />
        </motion.div>
      )}

      {/* Selected existing table info */}
      {selectedTable && !inviteTableIds.has(selectedTable._id) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-xl border border-light-gold/30 bg-light-gold/5 px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faCheck} className="text-light-gold" />
            <div>
              <p className="text-sm font-bold text-light-gold">
                {selectedTable.name || `Mesa #${selectedTable._id}`}
              </p>
              <p className="text-xs text-white/40">
                {selectedTable.persons.reduce(
                  (acc, p) => acc + 1 + p.companions.length,
                  0,
                )}
                /{selectedTable.seats} lugares ocupados
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tables grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-white/20">
            A carregar mesas...
          </div>
        ) : (
          filteredSlots.map((table, i) => {
            const slotKey = table ? `table-${table._id}` : `empty-slot-${i}`;
            return table ? (
              <TableCard
                key={slotKey}
                table={table}
                isSelected={data.tableId === String(table._id)}
                onSelect={() => handleSelectTable(table._id)}
              />
            ) : (
              <EmptySlotCard
                key={slotKey}
                slotNumber={i + 1}
                dimmed={!!searchTerm}
              />
            );
          })
        )}
      </div>

      {/* Info box */}
      <div className="flex gap-3 rounded-xl border border-white/5 bg-white/5 p-4">
        <FontAwesomeIcon
          icon={faInfoCircle}
          className="mt-0.5 shrink-0 text-light-gold/40"
        />
        <p className="text-xs leading-relaxed text-white/40">
          Ao criares uma mesa tornas-te o{" "}
          <span className="text-white/60">responsável</span> e podes convidar
          amigos pelo nome no teu perfil. Podes alterar a mesa mais tarde no teu
          perfil enquanto o período de mesas estiver aberto.{" "}
          <span className="text-white/60">
            A escolha de mesa é opcional — podes concluir a inscrição e escolher
            depois.
          </span>
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="border-white/15 border px-6 py-2.5 font-gala text-sm font-semibold text-white/50 transition-all hover:border-white/30 hover:text-white/80"
        >
          ← Voltar
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className={[
              "border px-5 py-2.5 font-gala text-sm font-semibold transition-all",
              data.tableId === "none"
                ? "border-white/30 text-white/70"
                : "border-white/10 text-white/30 hover:border-white/20 hover:text-white/50",
            ].join(" ")}
          >
            Sem mesa
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canContinue}
            className="border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            Rever Dados →
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function TableCard({
  table,
  isSelected,
  onSelect,
}: Readonly<{ table: Table; isSelected: boolean; onSelect: () => void }>) {
  const occupancy = table.persons.reduce(
    (acc, p) => acc + 1 + p.companions.length,
    0,
  );
  const isFull = occupancy >= table.seats;

  let containerStyles =
    "border-white/10 bg-white/5 hover:border-white/30 cursor-pointer";
  if (isSelected)
    containerStyles =
      "border-light-gold bg-light-gold/10 ring-1 ring-light-gold cursor-pointer";
  else if (isFull)
    containerStyles = "border-white/5 bg-white/2 opacity-50 cursor-not-allowed";

  return (
    <button
      onClick={() => !isFull && onSelect()}
      disabled={isFull && !isSelected}
      className={`group relative flex flex-col items-center gap-3 rounded-2xl border p-4 transition-all ${containerStyles}`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-[0.6rem] font-bold uppercase text-white/30">
          #{table._id}
        </span>
        {isSelected && (
          <FontAwesomeIcon icon={faCheck} className="text-xs text-light-gold" />
        )}
      </div>
      <h4
        className={`text-sm font-bold ${
          isSelected ? "text-light-gold" : "text-white/80"
        }`}
      >
        {table.name || "Mesa sem nome"}
      </h4>
      <div className="pointer-events-none flex w-full justify-center">
        <VisualTable table={table} alwaysVisible className="p-8" />
      </div>
      <div className="flex w-full items-center justify-between text-[0.65rem]">
        <div className="flex items-center gap-1.5 text-white/40">
          <FontAwesomeIcon icon={faUsers} />
          <span>
            {occupancy}/{table.seats}
          </span>
        </div>
        {isFull && !isSelected && (
          <span className="font-bold uppercase text-red-400/80">Cheia</span>
        )}
      </div>
    </button>
  );
}

function EmptySlotCard({
  slotNumber,
  dimmed,
}: Readonly<{ slotNumber: number; dimmed: boolean }>) {
  const placeholder: Table = {
    _id: -slotNumber,
    name: null,
    head: null,
    seats: DEFAULT_SEATS,
    persons: [],
  };
  return (
    <div
      className={`bg-white/2 flex flex-col items-center gap-3 rounded-2xl border border-white/5 p-4 transition-opacity ${
        dimmed ? "opacity-20" : "opacity-40"
      }`}
    >
      <span className="text-[0.6rem] font-bold uppercase text-white/25">
        Mesa #{slotNumber}
      </span>
      <div className="pointer-events-none flex w-full justify-center">
        <VisualTable table={placeholder} alwaysVisible className="p-8" />
      </div>
      <span className="text-[0.65rem] text-white/25">Livre</span>
    </div>
  );
}
