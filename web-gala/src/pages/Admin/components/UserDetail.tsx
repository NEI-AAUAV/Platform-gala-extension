import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faEye,
  faExternalLinkAlt,
  faHandDots,
  faCircleCheck,
  faPen,
  faTrash,
  faGhost,
  faUpload,
  faClock,
  faEnvelope,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FrangoIcon } from "@/assets/icons";
import { useRegistrationConfig } from "@/hooks/useRegistrationConfig";
import { INPUT_CLS } from "./AdminUI";

const BUS_LABEL: Record<string, string> = {
  ROUND_TRIP: "Ida e volta",
  ONE_WAY: "Só ida",
  NONE: "Sem autocarro",
};

const orange = { color: "#DD8500" };
const green = { color: "#198754" };
const red = { color: "#DC3545" };

const dishIcon = new Map<string, React.ReactNode>([
  ["NOR", <FrangoIcon key="NOR" style={orange} />],
  [
    "VEG",
    <span key="VEG" style={green}>
      🥬
    </span>,
  ], // using simple emoji/icon representation as faSeedling might not be imported if we don't need to bloat
]);

function ProofRow({
  label,
  url,
  confirmed,
  phase,
  onUpload,
  onReject,
  onConfirm,
  uploading,
}: {
  readonly label: string;
  readonly url: string | null;
  readonly confirmed: boolean;
  readonly phase: number;
  readonly onUpload: (phase: number, file: File) => void;
  readonly onReject: (phase: number) => void;
  readonly onConfirm: (phase: number) => void;
  readonly uploading: boolean;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onUpload(phase, e.target.files[0]);
    }
  };

  const getStatusInfo = () => {
    if (confirmed) return { color: "text-emerald-400/75", label: "Validado" };
    if (url) return { color: "text-yellow-400/70", label: "Por rever" };
    return { color: "text-white/25", label: "Não enviado" };
  };

  const { color: statusColor, label: statusLabel } = getStatusInfo();

  const isPdf = url?.toLowerCase().includes("pdf");

  return (
    <div className="bg-white/4 flex flex-col gap-2 px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-white/60">{label}</span>
          <span
            className={["text-[0.6rem] font-semibold", statusColor].join(" ")}
          >
            {statusLabel}
          </span>
        </div>
        {url ? (
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-dark-gold/40 px-3 py-1 text-[0.6rem] font-bold text-dark-gold transition hover:bg-dark-gold/10"
            >
              <FontAwesomeIcon icon={isPdf ? faExternalLinkAlt : faEye} />
              Ver
            </a>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-full border border-blue-500/40 px-3 py-1 text-[0.6rem] font-bold text-blue-400 transition hover:bg-blue-500/10 disabled:opacity-50"
              title="Substituir comprovativo"
            >
              <FontAwesomeIcon icon={faUpload} />
              {uploading ? "..." : "Substituir"}
            </button>
            {!confirmed && (
              <button
                type="button"
                onClick={() => onConfirm(phase)}
                className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 px-3 py-1 text-[0.6rem] font-bold text-emerald-400 transition hover:bg-emerald-500/10"
                title="Validar comprovativo"
              >
                <FontAwesomeIcon icon={faCircleCheck} />
                Validar
              </button>
            )}
            <button
              type="button"
              onClick={() => onReject(phase)}
              className="flex items-center gap-1.5 rounded-full border border-red-500/40 px-3 py-1 text-[0.6rem] font-bold text-red-400 transition hover:bg-red-500/10"
              title="Rejeitar comprovativo"
            >
              <FontAwesomeIcon icon={faTrash} />
              Rejeitar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[0.6rem] text-white/25">Não enviado</span>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[0.6rem] font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faUpload} />
              {uploading ? "A enviar..." : "Enviar (Admin)"}
            </button>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  readonly label: string;
  readonly value: React.ReactNode;
  readonly icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white/4 flex flex-col gap-0.5 px-3 py-2">
      <span className="text-[0.55rem] font-bold uppercase tracking-widest text-white/25">
        {label}
      </span>
      <span className="flex items-center gap-1.5 text-sm text-white/80">
        {icon}
        {value}
      </span>
    </div>
  );
}

export default function UserDetail({
  user,
  tables,
  buses,
  uploadingProof,
  onConfirmPayment,
  onSendPaymentReminder,
  onAssignBus,
  onEdit,
  onDelete,
  onClose,
  onUploadProof,
  onRejectProof,
  onAssignTable,
}: {
  readonly user: User;
  readonly tables: Table[];
  readonly buses: { id: string; name: string; capacity: number }[];
  readonly uploadingProof: boolean;
  readonly onConfirmPayment: (phase?: number) => void;
  readonly onSendPaymentReminder: () => void;
  readonly onAssignBus: (busId: string | null) => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
  readonly onUploadProof: (phase: number, file: File) => void;
  readonly onRejectProof: (phase: number) => void;
  readonly onAssignTable: (tableId: string | null) => void;
}) {
  const { config } = useRegistrationConfig();
  const mealLabel =
    config.mealOptions.find((m) => m.id === user.meal_option)?.label ??
    user.meal_option ??
    "—";

  const fallbackPhone =
    user.phone?.trim() ||
    (user as User & { phone_number?: string; contact_phone?: string })
      .phone_number ||
    (user as User & { phone_number?: string; contact_phone?: string })
      .contact_phone ||
    "—";
  const fallbackAllergies =
    user.food_allergies ||
    (user as User & { allergies?: string }).allergies ||
    "—";
  const isPartiallyPaid =
    user.phased_payment && user.payment_phase1_confirmed && !user.has_payed;

  return (
    <div className="flex max-h-[80vh] flex-col gap-5 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-start justify-between bg-[#182c2a] pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-gala text-xl font-bold text-white">
              {user.name}
            </h2>
            {user.admin_created && (
              <FontAwesomeIcon
                icon={faGhost}
                className="text-white/20"
                title="Inscrição manual (sem conta)"
              />
            )}
          </div>
          <p className="text-xs text-white/40">{user.email}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="hover:bg-white/8 flex h-8 w-8 items-center justify-center text-white/30 transition hover:text-white/70"
            title="Editar Inscrição"
          >
            <FontAwesomeIcon icon={faPen} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center text-red-400/50 transition hover:bg-red-400/10 hover:text-red-400"
            title="Eliminar Inscrição"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-white/8 flex h-8 w-8 items-center justify-center text-white/30 transition hover:text-white/70"
            title="Fechar"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      </div>

      {/* Personal data */}
      <div className="grid grid-cols-2 gap-2">
        <DetailRow label="NMec" value={String(user.nmec)} />
        <DetailRow
          label="Matrícula"
          value={
            user.matriculation ? `${user.matriculation}º ano` : "Alumni / Outro"
          }
        />
        <DetailRow label="Email" value={user.email} />
        <DetailRow label="Telefone" value={fallbackPhone} />
        <DetailRow
          label="Autocarro"
          value={BUS_LABEL[user.bus_option] ?? user.bus_option}
        />
        <DetailRow
          label="Prato"
          value={mealLabel}
          icon={dishIcon.get(user.meal_option ?? "")}
        />
        {user.food_allergies && (
          <div className="col-span-2">
            <DetailRow
              label="Alergias"
              value={fallbackAllergies}
              icon={<FontAwesomeIcon icon={faHandDots} style={red} />}
            />
          </div>
        )}
      </div>

      {/* Companions */}
      {user.companions.length > 0 && (
        <div>
          <p className="mb-2 text-[0.55rem] font-bold uppercase tracking-widest text-white/25">
            Acompanhantes ({user.companions.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {user.companions.map((c, i) => {
              const companion = c as Companion & { meal?: string };
              const companionDishId = companion.dish || companion.meal || "—";
              const companionDish =
                config.mealOptions.find((m) => m.id === companionDishId)?.label ??
                config.mealOptions.find((m) => m.dishType === companionDishId.toUpperCase())?.label ??
                companionDishId;
              const companionAllergies = companion.allergies || "—";
              return (
                <div
                  key={c.name || i}
                  className="bg-white/4 flex items-center gap-3 px-3 py-2 text-sm"
                >
                  <span className="text-white/40">#{i + 1}</span>
                  <span className="text-white/85 min-w-0 flex-1 truncate">
                    {c.name || "Sem nome"}
                  </span>
                  {c.email && (
                    <span className="text-white/45 min-w-0 flex-1 truncate text-xs">
                      {c.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    {dishIcon.get(companionDish)}
                  </span>
                  <span className="text-white/65 text-xs">
                    Prato: {companionDish}
                  </span>
                  <span className="text-xs text-red-400/70">
                    Alergias: {companionAllergies}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mesa */}
      <div>
        <p className="mb-2 text-[0.55rem] font-bold uppercase tracking-widest text-white/25">
          Mesa
        </p>
        <select
          value={user.table_id ?? ""}
          onChange={(e) => onAssignTable(e.target.value || null)}
          className={`w-full ${INPUT_CLS}`}
        >
          <option value="">Sem mesa</option>
          {tables.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name || `Mesa #${t._id}`} (
              {t.persons.reduce(
                (acc, p) => acc + 1 + (p.companions?.length ?? 0),
                0,
              )}
              /{t.seats})
            </option>
          ))}
        </select>
      </div>

      {/* Pagamento */}
      <div>
        <p className="mb-2 text-[0.55rem] font-bold uppercase tracking-widest text-white/25">
          Pagamento
        </p>
        <div className="flex flex-col gap-2">
          <ProofRow
            label="Comprovativo Fase 1"
            url={user.payment_proof_url}
            confirmed={user.payment_phase1_confirmed}
            phase={1}
            onUpload={onUploadProof}
            onReject={onRejectProof}
            onConfirm={onConfirmPayment}
            uploading={uploadingProof}
          />
          {user.phased_payment && (
            <ProofRow
              label="Comprovativo Fase 2"
              url={user.payment_proof_url_phase2}
              confirmed={user.payment_phase2_confirmed}
              phase={2}
              onUpload={onUploadProof}
              onReject={onRejectProof}
              onConfirm={onConfirmPayment}
              uploading={uploadingProof}
            />
          )}
          {(user.payment_expired || user.registration_active === false) && (
            <div className="flex items-center gap-2 bg-red-500/10 px-3 py-2 text-sm text-red-300/80">
              <FontAwesomeIcon icon={faTriangleExclamation} /> Inscrição
              desativada por falta de comprovativo no prazo.
            </div>
          )}
          {isPartiallyPaid && (
            <div className="flex items-center gap-2 bg-sky-500/10 px-3 py-2 text-sm text-sky-300/80">
              <FontAwesomeIcon icon={faClock} /> Pagamento parcialmente
              validado.
            </div>
          )}
          {user.has_payed ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              <FontAwesomeIcon icon={faCircleCheck} /> Pagamento confirmado
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onConfirmPayment(undefined)}
                className="w-full bg-dark-gold py-2.5 text-sm font-bold text-black transition hover:bg-yellow-600"
              >
                <FontAwesomeIcon icon={faCircleCheck} className="mr-2" />
                Confirmar Pagamento
              </button>
              <button
                type="button"
                onClick={onSendPaymentReminder}
                className="w-full border border-light-gold/20 py-2.5 text-sm font-bold text-white/60 transition hover:border-white/25 hover:text-white/80"
              >
                <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                {user.payment_reminder_sent
                  ? "Reenviar lembrete"
                  : "Lembrar por email"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Autocarro */}
      {user.bus_option !== "NONE" && buses.length > 0 && (
        <div>
          <p className="mb-2 text-[0.55rem] font-bold uppercase tracking-widest text-white/25">
            Autocarro atribuído
          </p>
          <select
            value={user.bus_assignment ?? ""}
            onChange={(e) => onAssignBus(e.target.value || null)}
            className={`w-full ${INPUT_CLS}`}
          >
            <option value="">Não atribuído</option>
            {buses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
