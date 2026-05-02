import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  faPen,
  faCamera,
  faUserPlus,
  faXmark,
  faSearch,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import VisualTable from "@/components/Table/VisualTable";
import GuestList from "@/components/TableModal/GuestList";
import AcceptPending from "./AcceptPending";
import useTableEdit from "@/hooks/tableHooks/useTableEdit";
import Avatar from "@/components/Avatar";
import useTableLeave from "@/hooks/tableHooks/useTableLeave";
import { useAppToast } from "@/components/ui/Toast";
import { extractApiError } from "@/utils/apiError";
import GalaService from "@/services/GalaService";
import useNEIUser from "@/hooks/useNEIUser";
import { useConfigStore } from "@/stores/useConfigStore";

type EditTableProps = {
  readonly table: Table;
  readonly mutate: () => void;
};

type SearchResult = { id: number; name: string; email: string };

function InvitePanel({ table, mutate }: { table: Table; mutate: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const toast = useAppToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const pending = table.invites ?? [];

  const handleSearch = (q: string) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await GalaService.user.searchUsers(q);
        // Filter out users already in the table or already invited
        const tablePersonIds = new Set(table.persons.map((p) => p.id));
        setResults(data.filter((u) => !tablePersonIds.has(u.id)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const invite = async (userId: number) => {
    try {
      await GalaService.table.inviteUser(table._id, userId);
      toast.success("Convite enviado!");
      setQuery("");
      setResults([]);
      mutate();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao enviar convite."));
    }
  };

  const revoke = async (userId: number) => {
    try {
      await GalaService.table.revokeInvite(table._id, userId);
      toast.success("Convite retirado.");
      mutate();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao retirar convite."));
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
        <FontAwesomeIcon icon={faUserPlus} /> Convidar para a Mesa
      </h4>

      {/* Search box */}
      <div className="relative">
        <FontAwesomeIcon
          icon={faSearch}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-xs"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Procurar por nome ou email..."
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-light-gold/40"
        />
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-[#111] divide-y divide-white/5 overflow-hidden">
          {results.map((u) => {
            const alreadyInvited = pending.includes(u.id);
            return (
              <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white/80">{u.name}</p>
                  <p className="truncate text-[0.6rem] text-white/30">{u.email}</p>
                </div>
                {alreadyInvited ? (
                  <span className="shrink-0 text-[0.6rem] font-bold uppercase text-light-gold/60">
                    Convidado
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => invite(u.id)}
                    className="shrink-0 rounded-full border border-light-gold/40 px-3 py-1 text-[0.6rem] font-bold text-light-gold hover:bg-light-gold/10 transition-all"
                  >
                    Convidar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {searching && (
        <p className="text-[0.65rem] text-white/30">A procurar...</p>
      )}

      {/* Pending invites */}
      {pending.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-white/20">
            Convites pendentes
          </p>
          {pending.map((uid) => (
            <PendingInviteRow
              key={uid}
              userId={uid}
              onRevoke={() => revoke(uid)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PendingInviteRow({
  userId,
  onRevoke,
}: {
  userId: number;
  onRevoke: () => void;
}) {
  const { neiUser } = useNEIUser(userId);
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/3 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <Avatar id={userId} className="w-4 rounded-full" />
        <span className="truncate text-xs text-white/60">
          {neiUser ? `${neiUser.name} ${neiUser.surname}` : `#${userId}`}
        </span>
      </div>
      <button
        type="button"
        onClick={onRevoke}
        title="Retirar convite"
        className="shrink-0 rounded-full p-1 text-white/20 transition-colors hover:text-red-400"
      >
        <FontAwesomeIcon icon={faXmark} className="text-xs" />
      </button>
    </div>
  );
}

function PhotoUpload({ table, mutate }: { table: Table; mutate: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useAppToast();
  const { raw } = useConfigStore();
  const photoEnabled = (raw?.table_photo_enabled as boolean) ?? true;

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      await GalaService.table.uploadPhoto(table._id, file);
      mutate();
      toast.success("Foto atualizada.");
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao enviar foto."));
    } finally {
      setUploading(false);
    }
  };

  if (!photoEnabled && !table.photo_url) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-dashed border-white/10 bg-white/2 p-4">
      <div className="flex items-center gap-4">
        {table.photo_url ? (
          <img
            src={table.photo_url}
            alt="foto de grupo"
            className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/30">
            <FontAwesomeIcon icon={faCamera} />
          </div>
        )}
        <div>
          <p className="text-xs font-bold text-white/80">Foto de Grupo</p>
          <p className="text-[0.6rem] text-white/40 uppercase tracking-tighter">Visível para todos na mesa</p>
        </div>
      </div>
      {photoEnabled && (
        <>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-[0.6rem] font-bold text-white/70 hover:border-light-gold/40 hover:text-light-gold transition-all disabled:opacity-40"
          >
            {uploading ? <FontAwesomeIcon icon={faSpinner} spin /> : "ALTERAR"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
        </>
      )}
    </div>
  );
}

export default function EditTable({ table, mutate }: EditTableProps) {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState(
    {} as { name?: boolean; server?: boolean },
  );
  const navigate = useNavigate();
  const toast = useAppToast();

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
      <div className="flex h-full flex-col gap-8">
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

        {/* Invite Section */}
        <InvitePanel table={table} mutate={mutate} />

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
          <PhotoUpload table={table} mutate={mutate} />

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
