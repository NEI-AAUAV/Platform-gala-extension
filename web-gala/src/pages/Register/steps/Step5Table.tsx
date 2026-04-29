import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch, faUsers, faPlus, faCheck, faInfoCircle,
  faCopy, faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import { RegistrationConfig } from "@/config/registrationConfig";
import { WizardData } from "@/hooks/useWizardState";
import useTables from "@/hooks/tableHooks/useTables";
import useLimits from "@/hooks/useLimits";
import VisualTable from "@/components/Table/VisualTable";

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
  const slots: Array<Table | null> = Array(maxCount).fill(null);
  sorted.forEach((t, i) => { if (i < maxCount) slots[i] = t; });
  return slots;
}

export default function Step5Table({ data, onUpdate, onNext, onBack }: Readonly<Props>) {
  const { tables, isLoading } = useTables();
  const { limits } = useLimits();
  const [searchTerm, setSearchTerm] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [copiedToken, setCopiedToken] = useState(false);
  const [searchParams] = useSearchParams();

  // Pre-fill table name from user name when switching to "new"
  useEffect(() => {
    if (data.tableId === "new" && !newTableName) {
      setNewTableName("");
    }
  }, [data.tableId]);

  // Auto-select from URL param (invite link)
  useEffect(() => {
    const tableIdParam = searchParams.get("table");
    if (tableIdParam && tables && !data.tableId) {
      const tableExists = tables.find((t) => String(t._id) === tableIdParam);
      if (tableExists) onUpdate({ tableId: tableIdParam, tableRole: "member" });
    }
  }, [searchParams, tables, data.tableId, onUpdate]);

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

  const selectedTable = data.tableId && data.tableId !== "new" && data.tableId !== "none"
    ? tables.find((t) => String(t._id) === data.tableId) ?? null
    : null;

  const copyInviteLink = (token: string, tableId: number) => {
    const url = `${window.location.origin}/register?table=${tableId}&token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleSelectTable = (id: number) => {
    onUpdate({ tableId: String(id), tableRole: "member" });
  };

  const handleCreateNew = () => {
    onUpdate({ tableId: "new", tableRole: "owner" });
  };

  const handleSkip = () => {
    onUpdate({ tableId: "none", tableRole: null });
  };

  // Pass newTableName through so backend can use it when creating
  const handleNext = () => {
    if (data.tableId === "new") {
      onUpdate({ tableName: newTableName || undefined });
    }
    onNext();
  };

  const canContinue = data.tableId !== null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-6"
    >
      <p className="text-sm text-white/50">
        Escolhe onde te queres sentar. Podes juntar-te a uma mesa existente, criar uma nova para o teu grupo, ou continuar sem mesa.
      </p>

      {/* Search + action bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
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
            Dá um nome à tua mesa. Poderás partilhar o link de convite depois de concluíres a inscrição.
          </p>
          <input
            type="text"
            placeholder="Ex: Os Fixolas, Mesa A, ..."
            maxLength={40}
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            className="rounded-lg border border-white/15 bg-[#1c1c1e] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-light-gold/50"
          />
        </motion.div>
      )}

      {/* Selected existing table info */}
      {selectedTable && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-xl border border-light-gold/30 bg-light-gold/5 px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faCheckCircle} className="text-light-gold" />
            <div>
              <p className="text-sm font-bold text-light-gold">{selectedTable.name || `Mesa #${selectedTable._id}`}</p>
              <p className="text-xs text-white/40">
                {selectedTable.persons.reduce((acc, p) => acc + 1 + p.companions.length, 0)}/{selectedTable.seats} lugares ocupados
              </p>
            </div>
          </div>
          {selectedTable.invite_token && (
            <button
              type="button"
              onClick={() => copyInviteLink(selectedTable.invite_token!, selectedTable._id)}
              className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/50 transition hover:border-light-gold/40 hover:text-light-gold"
            >
              <FontAwesomeIcon icon={copiedToken ? faCheck : faCopy} className="text-[0.6rem]" />
              {copiedToken ? "Copiado!" : "Copiar convite"}
            </button>
          )}
        </motion.div>
      )}

      {/* Tables grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-white/20">A carregar mesas...</div>
        ) : (
          filteredSlots.map((table, i) =>
            table ? (
              <TableCard
                key={table._id}
                table={table}
                isSelected={data.tableId === String(table._id)}
                onSelect={() => handleSelectTable(table._id)}
              />
            ) : (
              <EmptySlotCard key={`empty-${i}`} slotNumber={i + 1} dimmed={!!searchTerm} />
            )
          )
        )}
      </div>

      {/* Info box */}
      <div className="flex gap-3 rounded-xl border border-white/5 bg-white/5 p-4">
        <FontAwesomeIcon icon={faInfoCircle} className="mt-0.5 shrink-0 text-light-gold/40" />
        <p className="text-xs text-white/40 leading-relaxed">
          Ao criares uma mesa tornas-te o <span className="text-white/60">responsável</span> e recebes um link de convite para partilhar com amigos.
          Podes alterar a mesa mais tarde no teu perfil enquanto o período de mesas estiver aberto.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="border border-white/15 px-6 py-2.5 font-gala text-sm font-semibold text-white/50 transition-all hover:border-white/30 hover:text-white/80"
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
  table, isSelected, onSelect,
}: Readonly<{ table: Table; isSelected: boolean; onSelect: () => void }>) {
  const occupancy = table.persons.reduce((acc, p) => acc + 1 + p.companions.length, 0);
  const isFull = occupancy >= table.seats;

  let containerStyles = "border-white/10 bg-white/5 hover:border-white/30 cursor-pointer";
  if (isSelected) containerStyles = "border-light-gold bg-light-gold/10 ring-1 ring-light-gold cursor-pointer";
  else if (isFull) containerStyles = "border-white/5 bg-white/2 opacity-50 cursor-not-allowed";

  return (
    <button
      onClick={() => !isFull && onSelect()}
      disabled={isFull && !isSelected}
      className={`group relative flex flex-col items-center gap-3 rounded-2xl border p-4 transition-all ${containerStyles}`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-[0.6rem] font-bold uppercase text-white/30">#{table._id}</span>
        {isSelected && <FontAwesomeIcon icon={faCheck} className="text-xs text-light-gold" />}
      </div>
      <h4 className={`text-sm font-bold ${isSelected ? "text-light-gold" : "text-white/80"}`}>
        {table.name || "Mesa sem nome"}
      </h4>
      <div className="pointer-events-none w-full flex justify-center">
        <VisualTable table={table} alwaysVisible className="p-8" />
      </div>
      <div className="flex w-full items-center justify-between text-[0.65rem]">
        <div className="flex items-center gap-1.5 text-white/40">
          <FontAwesomeIcon icon={faUsers} />
          <span>{occupancy}/{table.seats}</span>
        </div>
        {isFull && !isSelected && <span className="font-bold uppercase text-red-400/80">Cheia</span>}
      </div>
    </button>
  );
}

function EmptySlotCard({ slotNumber, dimmed }: Readonly<{ slotNumber: number; dimmed: boolean }>) {
  const placeholder: Table = { _id: -slotNumber, name: null, head: null, seats: DEFAULT_SEATS, persons: [] };
  return (
    <div className={`flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-white/2 p-4 transition-opacity ${dimmed ? "opacity-20" : "opacity-40"}`}>
      <span className="text-[0.6rem] font-bold uppercase text-white/25">Mesa #{slotNumber}</span>
      <div className="pointer-events-none w-full flex justify-center">
        <VisualTable table={placeholder} alwaysVisible className="p-8" />
      </div>
      <span className="text-[0.65rem] text-white/25">Livre</span>
    </div>
  );
}
