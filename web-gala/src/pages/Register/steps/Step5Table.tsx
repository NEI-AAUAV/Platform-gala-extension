import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faUsers, faPlus, faCheck, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { RegistrationConfig } from "@/config/registrationConfig";
import { WizardData } from "@/hooks/useWizardState";
import useTables from "@/hooks/tableHooks/useTables";
import VisualTable from "@/components/Table/VisualTable";

interface Props {
  readonly config: RegistrationConfig;
  readonly data: WizardData;
  readonly onUpdate: (updates: Partial<WizardData>) => void;
  readonly onNext: () => void;
  readonly onBack: () => void;
}

export default function Step5Table({ data, onUpdate, onNext, onBack }: Readonly<Props>) {
  const { tables, isLoading } = useTables();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchParams] = useSearchParams();

  // Handle deep link invite: ?table=ID
  useEffect(() => {
    const tableIdParam = searchParams.get("table");
    if (tableIdParam && tables && !data.tableId) {
      const tableExists = tables.find(t => String(t._id) === tableIdParam);
      if (tableExists) {
        onUpdate({ tableId: tableIdParam, tableRole: "member" });
      }
    }
  }, [searchParams, tables, data.tableId, onUpdate]);

  const filteredTables = useMemo(() => {
    if (!tables) return [];
    return tables.filter(t => 
      t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t._id.toString().includes(searchTerm)
    );
  }, [tables, searchTerm]);

  const handleSelectTable = (id: number) => {
    onUpdate({ tableId: String(id), tableRole: "member" });
  };

  const handleCreateNew = () => {
    onUpdate({ tableId: "new", tableRole: "owner" });
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
      <div className="flex flex-col gap-2">
        <p className="text-sm text-white/50">
          Escolhe onde te queres sentar. Podes juntar-te a uma mesa existente ou criar uma nova para o teu grupo.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
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
          onClick={handleCreateNew}
          className={[
            "flex items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-bold transition-all",
            data.tableId === "new"
              ? "border-light-gold bg-light-gold text-black"
              : "border-light-gold/40 text-light-gold hover:bg-light-gold/10"
          ].join(" ")}
        >
          <FontAwesomeIcon icon={faPlus} />
          Criar Nova Mesa
        </button>
      </div>

      <div className="grid max-h-[400px] grid-cols-1 gap-4 overflow-y-auto pr-2 sm:grid-cols-2 lg:grid-cols-3 custom-scrollbar">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-white/20">A carregar mesas...</div>
        ) : (
          <TableList
            tables={filteredTables}
            selectedId={data.tableId}
            onSelect={handleSelectTable}
          />
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-white/5 p-4 border border-white/5">
        <div className="flex gap-3">
          <FontAwesomeIcon icon={faInfoCircle} className="mt-1 text-light-gold/40" />
          <p className="text-xs text-white/40 leading-relaxed">
            Se optares por criar uma nova mesa, serás o "Mesa Head" e poderás personalizar o nome e a foto da mesa mais tarde no teu perfil.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={onBack}
          className="border border-white/15 px-6 py-2.5 font-gala text-sm font-semibold text-white/50 transition-all hover:border-white/30 hover:text-white/80"
        >
          ← Voltar
        </button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          Rever Dados →
        </button>
      </div>
    </motion.div>
  );
}
function TableList({
  tables,
  selectedId,
  onSelect,
}: Readonly<{
  tables: any[];
  selectedId: string | null;
  onSelect: (id: number) => void;
}>) {
  if (tables.length === 0) {
    return (
      <div className="col-span-full py-12 text-center text-white/20 italic">
        Nenhuma mesa encontrada.
      </div>
    );
  }

  return (
    <>
      {tables.map((table) => (
        <TableCard
          key={table._id}
          table={table}
          isSelected={selectedId === String(table._id)}
          onSelect={() => onSelect(table._id)}
        />
      ))}
    </>
  );
}

function TableCard({
  table,
  isSelected,
  onSelect,
}: Readonly<{
  table: any;
  isSelected: boolean;
  onSelect: () => void;
}>) {
  const occupancy = table.persons?.length ?? 0;
  const max = 10;
  const isFull = occupancy >= max;

  let containerStyles = "border-white/10 bg-white/5 hover:border-white/30";
  if (isSelected) {
    containerStyles = "border-light-gold bg-light-gold/10 ring-1 ring-light-gold";
  } else if (isFull) {
    containerStyles = "border-white/5 bg-white/2 opacity-50 cursor-not-allowed";
  }

  return (
    <button
      onClick={() => !isFull && onSelect()}
      disabled={isFull && !isSelected}
      className={[
        "group relative flex flex-col items-center gap-3 rounded-2xl border p-4 transition-all",
        containerStyles,
      ].join(" ")}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-[0.6rem] font-bold uppercase text-white/30">Mesa #{table._id}</span>
        {isSelected && <FontAwesomeIcon icon={faCheck} className="text-xs text-light-gold" />}
      </div>

      <h4 className={["text-sm font-bold", isSelected ? "text-light-gold" : "text-white/80"].join(" ")}>
        {table.name || "Mesa sem nome"}
      </h4>

      <div className="scale-75 opacity-80">
        <VisualTable table={table} />
      </div>

      <div className="mt-2 flex w-full items-center justify-between text-[0.65rem]">
        <div className="flex items-center gap-1.5 text-white/40">
          <FontAwesomeIcon icon={faUsers} />
          <span>
            {occupancy}/{max}
          </span>
        </div>
        {isFull && !isSelected && <span className="font-bold uppercase text-red-400/80">Cheia</span>}
      </div>
    </button>
  );
}
