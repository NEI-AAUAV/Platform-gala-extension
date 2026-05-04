import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faEye, faExternalLinkAlt, faHandDots, faCircleCheck, faPen, faTrash, faGhost, faUpload } from "@fortawesome/free-solid-svg-icons";
import { FrangoIcon } from "@/assets/icons";
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
  ["VEG", <span key="VEG" style={green}>🥬</span>], // using simple emoji/icon representation as faSeedling might not be imported if we don't need to bloat
]);

function ProofRow({ label, url, phase, onUpload, onReject, uploading }: { 
  readonly label: string; 
  readonly url: string | null;
  readonly phase: number;
  readonly onUpload: (phase: number, file: File) => void;
  readonly onReject: (phase: number) => void;
  readonly uploading: boolean;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(phase, e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-white/4 px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/60">{label}</span>
        {url ? (
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-dark-gold/40 px-3 py-1 text-[0.6rem] font-bold text-dark-gold transition hover:bg-dark-gold/10"
            >
              <FontAwesomeIcon icon={url?.toLowerCase().includes("pdf") ? faExternalLinkAlt : faEye} />
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

function DetailRow({ label, value, icon }: {
  readonly label: string;
  readonly value: React.ReactNode;
  readonly icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-white/4 px-3 py-2">
      <span className="text-[0.55rem] font-bold uppercase tracking-widest text-white/25">{label}</span>
      <span className="flex items-center gap-1.5 text-sm text-white/80">{icon}{value}</span>
    </div>
  );
}

export default function UserDetail({ user, tables, buses, uploadingProof, onConfirmPayment, onAssignBus, onEdit, onDelete, onClose, onUploadProof, onRejectProof }: {
  readonly user: User;
  readonly tables: Table[];
  readonly buses: { id: string; name: string; capacity: number }[];
  readonly uploadingProof: boolean;
  readonly onConfirmPayment: () => void;
  readonly onAssignBus: (busId: string | null) => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
  readonly onUploadProof: (phase: number, file: File) => void;
  readonly onRejectProof: (phase: number) => void;
}) {
  const table = tables.find((t) => t._id === user.table_id) ?? null;

  return (
    <div className="flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between sticky top-0 bg-[#0f0f0f] pb-2 z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-gala text-xl font-bold text-white">{user.name}</h2>
            {user.admin_created && (
              <FontAwesomeIcon icon={faGhost} className="text-white/20" title="Inscrição manual (sem conta)" />
            )}
          </div>
          <p className="text-xs text-white/40">{user.email}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/8 hover:text-white/70"
            title="Editar Inscrição"
          >
            <FontAwesomeIcon icon={faPen} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400/50 transition hover:bg-red-400/10 hover:text-red-400"
            title="Eliminar Inscrição"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/8 hover:text-white/70"
            title="Fechar"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      </div>

      {/* Personal data */}
      <div className="grid grid-cols-2 gap-2">
        <DetailRow label="NMec" value={String(user.nmec)} />
        <DetailRow label="Matrícula" value={user.matriculation ? `${user.matriculation}º ano` : "Alumni / Outro"} />
        <DetailRow label="Email" value={user.email} />
        <DetailRow label="Telefone" value={user.phone ?? "—"} />
        <DetailRow label="Autocarro" value={BUS_LABEL[user.bus_option] ?? user.bus_option} />
        <DetailRow
          label="Prato"
          value={user.meal_option ?? "—"}
          icon={dishIcon.get(user.meal_option ?? "")}
        />
        {user.food_allergies && (
          <div className="col-span-2">
            <DetailRow
              label="Alergias"
              value={user.food_allergies}
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
            {user.companions.map((c, i) => (
              <div key={`${c.name}-${i}`} className="flex items-center gap-3 rounded-lg bg-white/4 px-3 py-2 text-sm">
                <span className="text-white/40">#{i + 1}</span>
                <span className="flex items-center gap-1">{dishIcon.get(c.dish)}</span>
                {c.allergies && (
                  <span className="flex items-center gap-1 text-xs text-red-400/70">
                    <FontAwesomeIcon icon={faHandDots} /> {c.allergies}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mesa */}
      <div>
        <p className="mb-2 text-[0.55rem] font-bold uppercase tracking-widest text-white/25">Mesa</p>
        {table ? (
          <div className="rounded-lg bg-white/4 px-3 py-2 text-sm text-white/70">
            <span className="font-semibold text-white/80">{table.name || `Mesa #${table._id}`}</span>
            <span className="ml-2 text-white/30">
              ({table.persons.reduce((acc, p) => acc + 1 + (p.companions?.length ?? 0), 0)}/{table.seats} lugares)
            </span>
          </div>
        ) : (
          <p className="text-sm text-white/30">Sem mesa atribuída.</p>
        )}
      </div>

      {/* Pagamento */}
      <div>
        <p className="mb-2 text-[0.55rem] font-bold uppercase tracking-widest text-white/25">Pagamento</p>
        <div className="flex flex-col gap-2">
          <ProofRow 
            label="Comprovativo Fase 1" 
            url={user.payment_proof_url} 
            phase={1}
            onUpload={onUploadProof}
            onReject={onRejectProof}
            uploading={uploadingProof}
          />
          {user.phased_payment && (
            <ProofRow 
              label="Comprovativo Fase 2" 
              url={user.payment_proof_url_phase2} 
              phase={2}
              onUpload={onUploadProof}
              onReject={onRejectProof}
              uploading={uploadingProof}
            />
          )}
          {user.has_payed ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              <FontAwesomeIcon icon={faCircleCheck} /> Pagamento confirmado
            </div>
          ) : (
            <button
              type="button"
              onClick={onConfirmPayment}
              className="w-full rounded-xl bg-dark-gold py-2.5 text-sm font-bold text-black transition hover:bg-yellow-600"
            >
              <FontAwesomeIcon icon={faCircleCheck} className="mr-2" />
              Confirmar Pagamento
            </button>
          )}
        </div>
      </div>

      {/* Autocarro */}
      {user.bus_option !== "NONE" && buses.length > 0 && (
        <div>
          <p className="mb-2 text-[0.55rem] font-bold uppercase tracking-widest text-white/25">Autocarro atribuído</p>
          <select
            value={user.bus_assignment ?? ""}
            onChange={(e) => onAssignBus(e.target.value || null)}
            className={`w-full ${INPUT_CLS}`}
          >
            <option value="">Não atribuído</option>
            {buses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
