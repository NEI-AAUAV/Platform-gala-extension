import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { faPen, faLink, faCamera, faCopy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import VisualTable from "@/components/Table/VisualTable";
import GuestList from "@/components/TableModal/GuestList";
import AcceptPending from "./AcceptPending";
import useTableEdit from "@/hooks/tableHooks/useTableEdit";
import Avatar from "@/components/Avatar";
import useTableLeave from "@/hooks/tableHooks/useTableLeave";
import { useAppToast } from "@/components/ui/Toast";
import { extractApiError } from "@/utils/apiError";

type EditTableProps = {
  readonly table: Table;
  readonly mutate: () => void;
};

export default function EditTable({ table, mutate }: EditTableProps) {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState(
    {} as { name?: boolean; server?: boolean },
  );
  const navigate = useNavigate();
  const toast = useAppToast();

  const inviteUrl = `${globalThis.location.origin}/gala/register?table=${table._id}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  useEffect(() => {
    if (titleRef.current?.value === undefined) return;
    titleRef.current!.style.setProperty(
      "width",
      `${titleRef.current!.scrollWidth}px`,
    );
    titleRef.current!.style.setProperty(
      "height",
      `${titleRef.current!.scrollHeight}px`,
    );
  }, []);

  return (
    <div className="h-full md:grid md:grid-cols-[1fr_min-content] md:gap-12">
      <div className="flex h-full flex-col gap-10">
        {/* Header with Table Name & Owner Badge */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 rounded-full border border-light-gold/20 bg-light-gold/10 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-light-gold">
               <Avatar className="w-3" /> Dono da Mesa
             </div>
          </div>
          
          <div className="flex items-start gap-4">
            <textarea
              rows={1}
              ref={titleRef}
              className="block w-full max-w-[20rem] select-none resize-none overflow-hidden rounded-xl border border-transparent bg-transparent py-1 text-3xl font-bold text-white transition-all focus:border-light-gold/30 focus:bg-white/5 focus:px-4 focus:outline-none"
              readOnly
              placeholder="Nome da Mesa"
              defaultValue={table.name ?? ""}
              onDoubleClick={() => {
                titleRef.current!.readOnly = false;
                titleRef.current?.focus();
              }}
              onBlur={() => {
                const val = titleRef.current?.value ?? "";
                if (val.length < 3 || val.length > 20) {
                  setError({ ...error, name: true });
                  return;
                }
                setError({ ...error, name: false });
                if (val === table.name) return;

                useTableEdit(table._id, { name: val })
                  .then(() => { toast.success("Nome guardado."); mutate(); })
                  .catch((e) => toast.error(extractApiError(e, "Erro ao guardar nome.")));
                titleRef.current!.readOnly = true;
              }}
            />
            <button
              className="mt-2 text-white/20 hover:text-light-gold transition-colors"
              type="button"
              onClick={() => {
                titleRef.current!.readOnly = false;
                titleRef.current?.focus();
              }}
            >
              <FontAwesomeIcon icon={faPen} />
            </button>
          </div>
          {error?.name && (
            <p className="text-[0.65rem] font-bold uppercase text-red-400">O nome deve ter entre 3 a 20 caracteres</p>
          )}
        </div>

        {/* Invite Link Section */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
            <FontAwesomeIcon icon={faLink} /> Link de Convite
          </h4>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/5 p-3 pr-4">
            <span className="truncate text-xs font-mono text-white/50">{inviteUrl}</span>
            <button 
              onClick={() => copyToClipboard(inviteUrl)}
              className="group flex flex-shrink-0 items-center justify-center gap-2 text-xs font-bold text-light-gold hover:text-white transition-all"
            >
              <FontAwesomeIcon icon={faCopy} className="text-light-gold/40 group-hover:text-light-gold" />
              COPIAR
            </button>
          </div>
        </div>

        {/* Guest List & Pending Requests */}
        <div className="space-y-6">
          <h4 className="text-[0.65rem] font-bold uppercase tracking-widest text-white/30">Lugar dos Convidados</h4>
          <GuestList persons={table.persons} />
          <AcceptPending
            persons={table.persons}
            tableId={table._id}
            mutate={mutate}
          />
        </div>

        {/* Table Management Actions */}
        <div className="mt-auto space-y-4">
           {/* Photo Upload (Mock UI) */}
           <div className="flex items-center justify-between rounded-xl border border-dashed border-white/10 bg-white/2 p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/30">
                  <FontAwesomeIcon icon={faCamera} />
                </div>
                <div>
                   <p className="text-xs font-bold text-white/80">Foto de Grupo</p>
                   <p className="text-[0.6rem] text-white/40 uppercase tracking-tighter">Visível para todos na mesa</p>
                </div>
              </div>
              <button className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-[0.6rem] font-bold text-white/70 hover:border-light-gold/40 hover:text-light-gold transition-all">
                ALTERAR
              </button>
           </div>

          <button
            className="w-full rounded-xl border border-red-500/30 bg-red-500/5 py-3 text-xs font-bold uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300"
            onClick={async () => {
              try {
                await useTableLeave(table._id);
                mutate();
                navigate("/reserve");
              } catch (e) {
                toast.error(extractApiError(e, "Não foi possível abandonar a mesa."));
              }
            }}
          >
            Abandonar Mesa
          </button>
          {error?.server && (
            <p className="text-center text-[0.65rem] font-bold uppercase text-red-500">
              Donos de mesas só podem sair se a mesa estiver vazia
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center">
        <VisualTable className="hidden max-h-[400px] md:block" table={table} />
        <VisualTable className="w-min md:hidden" table={table} />
      </div>
    </div>
  );
}
