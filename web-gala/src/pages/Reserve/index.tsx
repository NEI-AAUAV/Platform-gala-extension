import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import TableModal from "../TableModal";
import Table from "@/components/Table";
import useTables from "@/hooks/tableHooks/useTables";
import useSessionUser, { State } from "@/hooks/userHooks/useSessionUser";
import useLoginLink from "@/hooks/useLoginLink";
import useTime, { TimeStatus } from "@/hooks/timeHooks/useTime";
import GalaService from "@/services/GalaService";
import { useAppToast } from "@/components/ui/Toast";
import { extractApiError } from "@/utils/apiError";

export default function Reserve() {
  const { tableId } = useParams();
  const { tables, mutate: mutateTables } = useTables();
  const { sessionUser, state } = useSessionUser();
  const { time } = useTime();
  const navigate = useNavigate();
  const toast = useAppToast();

  const [tableName, setTableName] = useState("");
  const [creating, setCreating] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!tableId) document.body.style.overflow = "";
  }, [tableId]);

  const loginLink = useLoginLink();

  const canCreateTable =
    state === State.REGISTERED &&
    !sessionUser.table_id &&
    time?.tablesStatus === TimeStatus.OPEN;

  const handleCreateTable = async () => {
    const trimmed = tableName.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      setNameError("O nome deve ter entre 3 e 20 caracteres.");
      return;
    }
    setNameError(null);
    setCreating(true);
    try {
      const table = await GalaService.table.createTable({ name: trimmed });
      toast.success("Mesa criada com sucesso!");
      await mutateTables();
      dialogRef.current?.close();
      navigate(`/reserve/${table._id}`);
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao criar mesa."));
    } finally {
      setCreating(false);
    }
  };

  const header = {
    [State.NONE]: {
      text: "Inicia sessão para escolheres a tua mesa.",
      label: "Iniciar sessão",
      link: loginLink,
    },
    [State.AUTHENTICATED]: {
      text: "Efetua a inscrição para escolheres a tua mesa.",
      label: "Efetuar inscrição",
      link: "/register",
    },
    [State.REGISTERED]: {
      text: "Escolhe a tua mesa.",
    },
  };

  return (
    <>
      <div className="m-20 text-center">
        <p className="block text-2xl font-bold text-white/80">
          {header[state].text}
        </p>
        {header[state].link && (
          <Link
            className="mt-4 inline-block border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black"
            to={header[state].link || ""}
          >
            {header[state].label}
          </Link>
        )}
      </div>
      {canCreateTable && (
        <div className="mx-10 mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setTableName("");
              setNameError(null);
              dialogRef.current?.showModal();
            }}
            className="flex items-center gap-2 rounded-xl border border-light-gold/40 px-6 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black"
          >
            <FontAwesomeIcon icon={faPlus} />
            Criar Mesa
          </button>
        </div>
      )}
      <div className="m-10 grid grid-cols-[repeat(auto-fit,_minmax(13.25rem,_1fr))] gap-14">
        {tables?.map((table) => {
          const location = `/reserve/${table._id}`;
          return (
            <Link key={table._id} to={location}>
              <Table table={table} />
            </Link>
          );
        })}
      </div>
      {tableId !== undefined && <TableModal tableId={Number(tableId)} />}

      <dialog
        ref={dialogRef}
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-[#0a0a0a] p-0 text-white backdrop:bg-black/80"
      >
        <div className="space-y-4 p-8">
          <h2 className="text-xl font-bold text-white">Criar Mesa</h2>
          <div className="space-y-2">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label
              htmlFor="new-table-name"
              className="text-[0.65rem] font-bold uppercase tracking-widest text-white/30"
            >
              Nome da Mesa
            </label>
            <input
              id="new-table-name"
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateTable(); }}
              placeholder="Ex: Os Fixolas, Mesa A, ..."
              maxLength={20}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-light-gold/40"
            />
            {nameError && <p className="text-xs text-red-400">{nameError}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="flex-1 rounded-xl border border-white/20 py-3 text-xs font-bold uppercase tracking-widest text-white/40 transition-all hover:border-white/40 hover:text-white/60"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={handleCreateTable}
              className="flex-1 rounded-xl border border-light-gold/60 py-3 text-xs font-bold uppercase tracking-widest text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black disabled:opacity-40"
            >
              {creating ? "A criar..." : "Criar"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
