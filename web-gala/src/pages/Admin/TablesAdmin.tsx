import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash,
  faChair,
  faUsers,
  faCircleCheck,
  faPen,
  faCheck,
  faCamera,
  faSpinner,
  faPlus,
  faArrowRightArrowLeft,
  faBroom,
  faWrench,
} from "@fortawesome/free-solid-svg-icons";
import GalaService from "@/services/GalaService";
import useTables from "@/hooks/tableHooks/useTables";
import useTime from "@/hooks/timeHooks/useTime";
import useLimits from "@/hooks/useLimits";
import VisualTable from "@/components/Table/VisualTable";
import { useAppToast } from "@/components/ui/Toast";
import { extractApiError } from "@/utils/apiError";
import useNEIUser from "@/hooks/useNEIUser";
import { useConfigStore } from "@/stores/useConfigStore";
import {
  Field,
  NumberInput,
  DateTimeInput,
  Section,
} from "./components/AdminUI";
import { utcIsoToLocalInput, localInputToUtcIso } from "@/utils/datetime";

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
    setOpeningTime(
      time.tablesStart ? utcIsoToLocalInput(time.tablesStart) : "",
    );
    setClosingTime(time.tablesEnd ? utcIsoToLocalInput(time.tablesEnd) : "");
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
      await GalaService.time.editTimeSlots({
        tablesStart: openingTime ? localInputToUtcIso(openingTime) : undefined,
        tablesEnd: closingTime ? localInputToUtcIso(closingTime) : undefined,
      });
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
          <DateTimeInput
            value={openingTime}
            onChange={(v) => {
              setOpeningTime(v);
              setDirty(true);
            }}
          />
        </Field>
        <Field label="Encerramento">
          <DateTimeInput
            value={closingTime}
            onChange={(v) => {
              setClosingTime(v);
              setDirty(true);
            }}
          />
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
        className="shrink-0 border border-dark-gold/40 px-4 py-2 text-xs font-semibold text-dark-gold transition hover:bg-dark-gold/10"
      >
        Guardar
      </button>
    </div>
  );
}

// ─── Table photo toggle ───────────────────────────────────────────────────────

function TablePhotoToggle() {
  const { raw, fetch, save } = useConfigStore();
  const toast = useAppToast();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!raw) fetch();
  }, [raw, fetch]);

  const enabled = (raw?.table_photo_enabled as boolean) ?? true;

  const toggle = async () => {
    setSaving(true);
    try {
      await save({ table_photo_enabled: !enabled });
      toast.success(
        enabled ? "Upload de foto desativado." : "Upload de foto ativado.",
      );
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao guardar."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-white/70">
          {enabled ? "Ativado" : "Desativado"}
        </span>
        <span className="text-[0.6rem] text-white/30">
          {enabled
            ? "Os donos de mesa podem fazer upload de uma foto de grupo."
            : "Nenhum utilizador pode fazer upload de foto (admins continuam a poder)."}
        </span>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className={[
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40",
          enabled ? "bg-light-gold" : "bg-white/15",
        ].join(" ")}
        aria-label="Toggle table photo upload"
      >
        <span
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
            enabled ? "translate-x-5" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

// ─── Member row with resolved name ───────────────────────────────────────────

function MemberRow({
  person,
  isHead,
  onRemove,
  onMove,
}: {
  readonly person: Person;
  readonly isHead: boolean;
  readonly onRemove: () => void;
  readonly onMove: () => void;
}) {
  const { neiUser } = useNEIUser(person.id);
  const displayName = neiUser
    ? `${neiUser.name} ${neiUser.surname}`
    : `#${person.id}`;

  return (
    <div className="bg-white/4 flex items-center justify-between px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        {person.confirmed && (
          <FontAwesomeIcon
            icon={faCircleCheck}
            className="text-xs text-emerald-400/60"
          />
        )}
        <span className="truncate text-xs text-white/70">{displayName}</span>
        {isHead && (
          <span className="shrink-0 rounded-full bg-dark-gold/20 px-2 py-0.5 text-[0.5rem] font-bold uppercase tracking-widest text-dark-gold">
            Responsável
          </span>
        )}
        {person.companions.length > 0 && (
          <span className="shrink-0 text-[0.6rem] text-white/30">
            +{person.companions.length} acomp.
          </span>
        )}
      </div>
      {!isHead && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMove}
            className="flex h-6 w-6 shrink-0 items-center justify-center text-blue-400/40 transition hover:bg-blue-500/10 hover:text-blue-400"
            title="Mover de mesa"
          >
            <FontAwesomeIcon
              icon={faArrowRightArrowLeft}
              className="text-[0.6rem]"
            />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-6 w-6 shrink-0 items-center justify-center text-red-400/40 transition hover:bg-red-500/10 hover:text-red-400"
            title="Remover da mesa"
          >
            <FontAwesomeIcon icon={faTrash} className="text-[0.6rem]" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Table card (admin) ───────────────────────────────────────────────────────

function TableAdminCard({
  table,
  onRemoveMember,
  onMoveMember,
  onRefresh,
}: {
  readonly table: Table;
  readonly onRemoveMember: (tableId: number, userId: number) => void;
  readonly onMoveMember: (userId: number) => void;
  readonly onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(table.name ?? "");
  const [editingSeats, setEditingSeats] = useState(false);
  const [seatsValue, setSeatsValue] = useState(table.seats);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useAppToast();
  const occupied = table.persons.reduce(
    (acc, p) => acc + 1 + (p.companions?.length ?? 0),
    0,
  );

  const saveName = async () => {
    if (nameValue.length < 3 || nameValue.length > 20) {
      toast.error("O nome deve ter entre 3 e 20 caracteres.");
      return;
    }
    try {
      await GalaService.table.editTable(table._id, { name: nameValue });
      toast.success("Nome atualizado.");
      onRefresh();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao guardar nome."));
    } finally {
      setEditingName(false);
    }
  };

  const saveSeats = async () => {
    if (seatsValue < 1) {
      toast.error("O número de lugares deve ser positivo.");
      return;
    }
    try {
      await GalaService.table.editTable(table._id, {
        name: table.name ?? nameValue,
        seats: seatsValue,
      });
      toast.success("Lugares atualizados.");
      onRefresh();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao guardar lugares."));
    } finally {
      setEditingSeats(false);
    }
  };

  const handlePhoto = async (file: File) => {
    setUploadingPhoto(true);
    try {
      await GalaService.table.uploadPhoto(table._id, file);
      toast.success("Foto atualizada.");
      onRefresh();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao enviar foto."));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeleteTable = async () => {
    // eslint-disable-next-line no-restricted-globals, no-alert
    if (!confirm("Tem a certeza que deseja eliminar esta mesa?")) return;
    try {
      await GalaService.admin.deleteTable(table._id);
      toast.success("Mesa eliminada.");
      onRefresh();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao eliminar mesa."));
    }
  };

  const [addingMember, setAddingMember] = useState(false);

  return (
    <div className="bg-white/3 hover:border-white/12 border border-light-gold/20 transition-colors">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] font-bold uppercase tracking-widest text-white/25">
            #{table._id}
          </span>
          {table.photo_url && (
            <img
              src={table.photo_url}
              alt=""
              className="h-5 w-5 rounded-full object-cover ring-1 ring-white/10"
            />
          )}
          <span className="font-gala text-sm font-semibold text-white/80">
            {table.name || "Sem nome"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">
            <FontAwesomeIcon icon={faUsers} className="mr-1.5" />
            {occupied}/{table.seats}
          </span>
          <div
            className={`h-1.5 w-1.5 rounded-full ${
              occupied >= table.seats ? "bg-red-400/60" : "bg-emerald-400/60"
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-light-gold/15 flex flex-col gap-4 border-t px-4 pb-4 pt-3">
          {/* Visual + photo + name edit */}
          <div className="flex items-start gap-5">
            <div className="shrink-0">
              <VisualTable table={table} alwaysVisible className="p-6" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3">
              {/* Name editor */}
              <div className="flex flex-col gap-1">
                <p className="text-[0.55rem] font-bold uppercase tracking-widest text-white/25">
                  Nome
                </p>
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={nameValue}
                      maxLength={20}
                      onChange={(e) => setNameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          saveName();
                        }
                        if (e.key === "Escape") {
                          setEditingName(false);
                        }
                      }}
                      className="flex-1 border border-light-gold/30 bg-white/5 px-2 py-1 text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={saveName}
                      className="flex h-6 w-6 shrink-0 items-center justify-center bg-light-gold/20 text-light-gold hover:bg-light-gold/30"
                    >
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="text-[0.6rem]"
                      />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setNameValue(table.name ?? "");
                      setEditingName(true);
                    }}
                    className="flex items-center gap-1.5 text-left text-xs text-white/60 transition-colors hover:text-light-gold"
                  >
                    {table.name || (
                      <span className="italic text-white/30">Sem nome</span>
                    )}
                    <FontAwesomeIcon
                      icon={faPen}
                      className="text-[0.55rem] text-white/30"
                    />
                  </button>
                )}
              </div>

              {/* Seats editor */}
              <div className="flex flex-col gap-1">
                <p className="text-[0.55rem] font-bold uppercase tracking-widest text-white/25">
                  Lugares
                </p>
                {editingSeats ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={seatsValue}
                      min={1}
                      onChange={(e) => setSeatsValue(Number(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveSeats();
                        if (e.key === "Escape") setEditingSeats(false);
                      }}
                      className="w-20 border border-light-gold/30 bg-white/5 px-2 py-1 text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={saveSeats}
                      className="flex h-6 w-6 shrink-0 items-center justify-center bg-light-gold/20 text-light-gold hover:bg-light-gold/30"
                    >
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="text-[0.6rem]"
                      />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSeatsValue(table.seats);
                      setEditingSeats(true);
                    }}
                    className="flex items-center gap-1.5 text-left text-xs text-white/60 transition-colors hover:text-light-gold"
                  >
                    {table.seats} lugares
                    <FontAwesomeIcon
                      icon={faPen}
                      className="text-[0.55rem] text-white/30"
                    />
                  </button>
                )}
              </div>

              {/* Photo */}
              <div className="flex flex-col gap-1">
                <p className="text-[0.55rem] font-bold uppercase tracking-widest text-white/25">
                  Foto
                </p>
                <div className="flex items-center gap-3">
                  {table.photo_url ? (
                    <img
                      src={table.photo_url}
                      alt="foto de grupo"
                      className="h-14 w-14 object-cover ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center bg-white/5 text-white/20">
                      <FontAwesomeIcon icon={faCamera} />
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileRef.current?.click()}
                    className="border-white/15 rounded-full border px-3 py-1.5 text-[0.6rem] font-semibold text-white/50 transition hover:border-light-gold/40 hover:text-light-gold disabled:opacity-40"
                  >
                    {(() => {
                      if (uploadingPhoto)
                        return <FontAwesomeIcon icon={faSpinner} spin />;
                      return table.photo_url ? "Alterar" : "Adicionar";
                    })()}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        handlePhoto(f);
                      }
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[0.55rem] font-bold uppercase tracking-widest text-white/25">
                Membros
              </p>
              <button
                type="button"
                onClick={() => setAddingMember(true)}
                className="flex items-center gap-1 text-[0.6rem] text-light-gold hover:underline"
              >
                <FontAwesomeIcon icon={faPlus} /> Adicionar Membro
              </button>
            </div>
            {table.persons.map((p) => (
              <MemberRow
                key={p.id}
                person={p}
                isHead={table.head === p.id}
                onRemove={() => onRemoveMember(table._id, p.id)}
                onMove={() => onMoveMember(p.id)}
              />
            ))}
            {table.persons.length === 0 && (
              <p className="text-xs italic text-white/30">Mesa vazia.</p>
            )}
          </div>

          {/* Delete Table Button */}
          <div className="mt-2 flex justify-end border-t border-white/5 pt-2">
            <button
              type="button"
              onClick={handleDeleteTable}
              className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
            >
              <FontAwesomeIcon icon={faTrash} />
              Eliminar Mesa
            </button>
          </div>

          {addingMember && (
            <AddMemberModal
              tableId={table._id}
              onClose={() => setAddingMember(false)}
              onSuccess={() => {
                setAddingMember(false);
                onRefresh();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
}) {
  return (
    <div className="bg-white/3 border border-light-gold/20 p-4">
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white/90">{value}</p>
      {sub && <p className="mt-0.5 text-[0.6rem] text-white/25">{sub}</p>}
    </div>
  );
}

// ─── Add Member Modal ────────────────────────────────────────────────────────

function AddMemberModal({
  tableId,
  onClose,
  onSuccess,
}: Readonly<{ tableId: number; onClose: () => void; onSuccess: () => void }>) {
  const [registrants, setRegistrants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useAppToast();

  useEffect(() => {
    GalaService.admin
      .listRegistrations()
      .then((users) =>
        setRegistrants(users.filter((u) => !u.table_id && !u.is_companion_of)),
      )
      .catch(() => toast.error("Erro ao carregar utilizadores."))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleAdd = async (userId: number) => {
    setSaving(true);
    try {
      await GalaService.admin.addMemberToTable(tableId, userId);
      toast.success("Membro adicionado.");
      onSuccess();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao adicionar membro."));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col gap-4 border border-light-gold/20 bg-[#182c2a] p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-white">
          Adicionar Membro (sem mesa)
        </h3>

        {(() => {
          if (loading)
            return (
              <p className="py-4 text-center text-sm text-white/50">
                A carregar...
              </p>
            );
          if (registrants.length === 0)
            return (
              <p className="py-4 text-center text-sm text-white/50">
                Não há inscritos sem mesa.
              </p>
            );
          return (
            <div className="flex max-h-60 flex-col gap-2 overflow-y-auto">
              {registrants.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between bg-white/5 p-2"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-white">
                      {u.name}
                    </span>
                    <span className="truncate text-xs text-white/50">
                      {u.email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdd(u._id)}
                    disabled={saving}
                    className="shrink-0 bg-light-gold/20 px-3 py-1 text-xs font-semibold text-light-gold hover:bg-light-gold/30 disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>
              ))}
            </div>
          );
        })()}

        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-white/50 transition hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Move Member Modal ───────────────────────────────────────────────────────

function MoveMemberModal({
  userId,
  onClose,
  onSuccess,
}: Readonly<{ userId: number; onClose: () => void; onSuccess: () => void }>) {
  const { tables } = useTables();
  const [saving, setSaving] = useState(false);
  const toast = useAppToast();

  const handleMove = async (tableId: number) => {
    setSaving(true);
    try {
      await GalaService.admin.moveMemberToTable(tableId, userId);
      toast.success("Membro movido.");
      onSuccess();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao mover membro."));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col gap-4 border border-light-gold/20 bg-[#182c2a] p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-white">
          Mover Membro para Outra Mesa
        </h3>

        {tables.length === 0 ? (
          <p className="py-4 text-center text-sm text-white/50">
            Não existem outras mesas.
          </p>
        ) : (
          <div className="flex max-h-60 flex-col gap-2 overflow-y-auto">
            {tables.map((t) => {
              const occ = t.persons.reduce(
                (s, p) => s + 1 + (p.companions?.length ?? 0),
                0,
              );
              const isFull = occ >= t.seats;
              const hasUser = t.persons.some((p) => p.id === userId);

              if (hasUser) return null; // don't show current table

              return (
                <div
                  key={t._id}
                  className="flex items-center justify-between bg-white/5 p-2"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-white">
                      {t.name || `Mesa #${t._id}`}
                    </span>
                    <span className="text-xs text-white/50">
                      {occ}/{t.seats} lugares
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMove(t._id)}
                    disabled={saving || isFull}
                    className="shrink-0 bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400 hover:bg-blue-500/30 disabled:opacity-50"
                  >
                    {isFull ? "Cheia" : "Mover"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-white/50 transition hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function TablesAdmin() {
  const { tables, mutate: refresh } = useTables();
  const { limits } = useLimits();
  const toast = useAppToast();

  const [movingMemberId, setMovingMemberId] = useState<number | null>(null);
  const [pruning, setPruning] = useState(false);
  const [repairing, setRepairing] = useState(false);

  const handlePrune = async () => {
    // eslint-disable-next-line no-restricted-globals, no-alert
    if (!confirm("Remover de todas as mesas os utilizadores não inscritos?"))
      return;
    setPruning(true);
    try {
      const result = await GalaService.admin.pruneTables();
      refresh();
      if (result.count === 0) {
        toast.success("Nenhum utilizador não inscrito encontrado nas mesas.");
      } else {
        toast.success(`${result.count} utilizador(es) removido(s) das mesas.`);
      }
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao limpar mesas."));
    } finally {
      setPruning(false);
    }
  };

  const handleRepair = async () => {
    setRepairing(true);
    try {
      const result = await GalaService.admin.repairTables();
      refresh();
      if (result.count === 0) {
        toast.success("Nenhuma inconsistência encontrada.");
      } else {
        toast.success(`${result.count} inconsistência(s) corrigida(s).`);
      }
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao reparar mesas."));
    } finally {
      setRepairing(false);
    }
  };

  const totalOccupied = tables.reduce(
    (acc, t) =>
      acc + t.persons.reduce((s, p) => s + 1 + (p.companions?.length ?? 0), 0),
    0,
  );
  const fullTables = tables.filter((t) => {
    const occ = t.persons.reduce(
      (s, p) => s + 1 + (p.companions?.length ?? 0),
      0,
    );
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
        <StatCard
          label="Mesas criadas"
          value={String(tables.length)}
          sub={
            limits?.maxTablesCount
              ? `/ ${limits.maxTablesCount} máx.`
              : undefined
          }
        />
        <StatCard label="Lugares ocupados" value={String(totalOccupied)} />
        <StatCard label="Mesas cheias" value={String(fullTables)} />
        <StatCard
          label="Mesas com espaço"
          value={String(tables.length - fullTables)}
        />
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

      <Section title="Foto de mesa">
        <Field label="Upload de foto de grupo pelos donos de mesa">
          <TablePhotoToggle />
        </Field>
      </Section>

      {/* Table list */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-gala text-base font-semibold text-white/70">
            Mesas ({tables.length})
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-[0.6rem] text-white/25">
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/60" />{" "}
                Disponível
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400/60" />{" "}
                Cheia
              </span>
            </div>
            <button
              type="button"
              onClick={handlePrune}
              disabled={pruning}
              className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-40"
            >
              <FontAwesomeIcon
                icon={pruning ? faSpinner : faBroom}
                spin={pruning}
              />
              Limpar não inscritos
            </button>
            <button
              type="button"
              onClick={handleRepair}
              disabled={repairing}
              className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-400 transition hover:bg-yellow-500/20 disabled:opacity-40"
            >
              <FontAwesomeIcon
                icon={repairing ? faSpinner : faWrench}
                spin={repairing}
              />
              Reparar inconsistências
            </button>
            <button
              type="button"
              onClick={async () => {
                // eslint-disable-next-line no-alert
                const name = prompt("Nome da mesa:");
                if (!name) return;
                try {
                  await GalaService.admin.createTable({ name, seats: 11 });
                  toast.success("Mesa criada.");
                  refresh();
                } catch (e) {
                  toast.error(extractApiError(e, "Erro ao criar mesa."));
                }
              }}
              className="flex items-center gap-2 bg-light-gold px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-yellow-600"
            >
              <FontAwesomeIcon icon={faPlus} />
              Nova Mesa
            </button>
          </div>
        </div>

        {tables.length === 0 ? (
          <div className="border-light-gold/15 bg-white/2 border py-12 text-center">
            <FontAwesomeIcon
              icon={faChair}
              className="mb-3 text-2xl text-white/10"
            />
            <p className="text-sm text-white/25">Nenhuma mesa criada ainda.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tables.map((table) => (
              <TableAdminCard
                key={table._id}
                table={table}
                onRemoveMember={handleRemoveMember}
                onMoveMember={setMovingMemberId}
                onRefresh={refresh}
              />
            ))}
          </div>
        )}
      </div>

      {movingMemberId && (
        <MoveMemberModal
          userId={movingMemberId}
          onClose={() => setMovingMemberId(null)}
          onSuccess={() => {
            setMovingMemberId(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
