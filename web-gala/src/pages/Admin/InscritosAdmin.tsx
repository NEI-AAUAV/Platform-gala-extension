import { useEffect, useRef, useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch, faCircleCheck, faCircleXmark, faHandDots,
  faEye, faSeedling, faBus, faChair,
  faDownload, faMagicWandSparkles, faXmark, faExternalLinkAlt,
  faUserGroup, faClock,
} from "@fortawesome/free-solid-svg-icons";
import GalaService from "@/services/GalaService";
import { useHomepageConfig } from "@/hooks/useHomepageConfig";
import useTables from "@/hooks/tableHooks/useTables";
import { useAppToast } from "@/components/ui/Toast";
import { extractApiError } from "@/utils/apiError";
import { FrangoIcon } from "@/assets/icons";
import { INPUT_CLS } from "./components/AdminUI";
import axios from "axios";
import { useUserStore } from "@/stores/useUserStore";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  ["VEG", <FontAwesomeIcon key="VEG" icon={faSeedling} style={green} />],
]);

async function downloadCsv(path: string, filename: string) {
  const token = useUserStore.getState().token;
  const response = await axios.get(path, {
    responseType: "blob",
    headers: { Authorization: `Bearer ${token}` },
  });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

interface Stats {
  total: number;
  paid: number;
  proofSent: number;
  pending: number;
  withTable: number;
  withBus: number;
  byYear: Record<string, number>;
  byMeal: Record<string, number>;
  byBusOption: Record<string, number>;
}

function computeStats(users: User[]): Stats {
  const byYear: Record<string, number> = {};
  const byMeal: Record<string, number> = {};
  const byBusOption: Record<string, number> = {};

  for (const u of users) {
    const yr = u.matriculation ? `${u.matriculation}º ano` : "Alumni";
    byYear[yr] = (byYear[yr] ?? 0) + 1;
    const meal = u.meal_option ?? "—";
    byMeal[meal] = (byMeal[meal] ?? 0) + 1;
    byBusOption[u.bus_option] = (byBusOption[u.bus_option] ?? 0) + 1;
  }

  return {
    total: users.length,
    paid: users.filter((u) => u.has_payed).length,
    proofSent: users.filter((u) => !u.has_payed && u.payment_proof_url).length,
    pending: users.filter((u) => !u.has_payed && !u.payment_proof_url).length,
    withTable: users.filter((u) => u.table_id !== null).length,
    withBus: users.filter((u) => u.bus_option !== "NONE").length,
    byYear,
    byMeal,
    byBusOption,
  };
}

function StatCard({ label, value, sub, icon, accent }: {
  readonly label: string;
  readonly value: string | number;
  readonly sub?: string;
  readonly icon?: React.ReactNode;
  readonly accent?: "green" | "yellow" | "red" | "default";
}) {
  const accentCls = {
    green: "text-emerald-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
    default: "text-white/90",
  }[accent ?? "default"];

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4">
      <div className="flex items-center gap-2 text-xs text-white/40">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${accentCls}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[0.6rem] text-white/25">{sub}</p>}
    </div>
  );
}

function MiniBar({ label, value, max, color }: {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-[0.65rem] text-white/50 truncate">{label}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/8">
        <div className={`absolute left-0 top-0 h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-[0.65rem] text-white/40">{value}</span>
    </div>
  );
}

// ─── Payment proof row ────────────────────────────────────────────────────────

function ProofRow({ label, url }: { readonly label: string; readonly url: string | null }) {
  if (!url) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-white/4 px-3 py-2">
        <span className="text-xs text-white/40">{label}</span>
        <span className="text-[0.6rem] text-white/25">Não enviado</span>
      </div>
    );
  }
  const isPdf = url.toLowerCase().includes("pdf");
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/4 px-3 py-2">
      <span className="text-xs text-white/60">{label}</span>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 rounded-full border border-dark-gold/40 px-3 py-1 text-[0.6rem] font-bold text-dark-gold transition hover:bg-dark-gold/10"
      >
        <FontAwesomeIcon icon={isPdf ? faExternalLinkAlt : faEye} />
        {isPdf ? "Abrir PDF" : "Ver imagem"}
      </a>
    </div>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────

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

// ─── User detail panel (dialog) ───────────────────────────────────────────────

function UserDetail({ user, tables, buses, onConfirmPayment, onAssignBus, onClose }: {
  readonly user: User;
  readonly tables: Table[];
  readonly buses: { id: string; name: string; capacity: number }[];
  readonly onConfirmPayment: () => void;
  readonly onAssignBus: (busId: string | null) => void;
  readonly onClose: () => void;
}) {
  const table = tables.find((t) => t._id === user.table_id) ?? null;

  return (
    <div className="flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between sticky top-0 bg-[#0f0f0f] pb-2">
        <div>
          <h2 className="font-gala text-xl font-bold text-white">{user.name}</h2>
          <p className="text-xs text-white/40">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/8 hover:text-white/70"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
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
              <div key={i} className="flex items-center gap-3 rounded-lg bg-white/4 px-3 py-2 text-sm">
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
          <ProofRow label="Comprovativo Fase 1" url={user.payment_proof_url} />
          {user.phased_payment && (
            <ProofRow label="Comprovativo Fase 2" url={user.payment_proof_url_phase2} />
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

// ─── Filters ─────────────────────────────────────────────────────────────────

type PaymentFilter = "all" | "paid" | "proof" | "pending";
type TableFilter = "all" | "with" | "without";

// ─── Main export ─────────────────────────────────────────────────────────────

export default function InscritosAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [tableFilter, setTableFilter] = useState<TableFilter>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [autoStrategy, setAutoStrategy] = useState<"year" | "order">("year");
  const [assigning, setAssigning] = useState(false);

  const detailRef = useRef<HTMLDialogElement>(null);
  const toast = useAppToast();
  const { config } = useHomepageConfig();
  const { tables } = useTables();
  const buses = config.bus_schedule.buses;

  const load = async () => {
    setLoading(true);
    try {
      const data = await GalaService.admin.listRegistrations();
      setUsers(data);
    } catch {
      toast.error("Erro ao carregar inscritos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => computeStats(users), [users]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (search) {
        const q = search.toLowerCase();
        if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !String(u.nmec).includes(q)) {
          return false;
        }
      }
      if (paymentFilter === "paid" && !u.has_payed) return false;
      if (paymentFilter === "proof" && (u.has_payed || !u.payment_proof_url)) return false;
      if (paymentFilter === "pending" && (u.has_payed || u.payment_proof_url)) return false;
      if (tableFilter === "with" && u.table_id === null) return false;
      if (tableFilter === "without" && u.table_id !== null) return false;
      return true;
    });
  }, [users, search, paymentFilter, tableFilter]);

  const openDetail = (user: User) => {
    setSelectedUser(user);
    detailRef.current?.showModal();
  };

  const handleConfirmPayment = async () => {
    if (!selectedUser) return;
    try {
      await GalaService.admin.confirmPayment(selectedUser._id);
      toast.success("Pagamento confirmado!");
      detailRef.current?.close();
      load();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao confirmar pagamento."));
    }
  };

  const handleAssignBus = async (busId: string | null) => {
    if (!selectedUser) return;
    try {
      await GalaService.homepage.assignBus(selectedUser._id, busId);
      toast.success("Autocarro atribuído.");
      load();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao atribuir autocarro."));
    }
  };

  const handleAutoAssign = async () => {
    setAssigning(true);
    try {
      await GalaService.homepage.autoAssignBuses(autoStrategy);
      toast.success("Auto-distribuição concluída.");
      load();
    } catch (e) {
      toast.error(extractApiError(e, "Erro na auto-distribuição."));
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* ── Statistics ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Total inscritos"
          value={stats.total}
          icon={<FontAwesomeIcon icon={faUserGroup} />}
        />
        <StatCard
          label="Pagamentos confirmados"
          value={stats.paid}
          accent="green"
          icon={<FontAwesomeIcon icon={faCircleCheck} />}
        />
        <StatCard
          label="Comprovativo enviado"
          value={stats.proofSent}
          accent="yellow"
          icon={<FontAwesomeIcon icon={faClock} />}
        />
        <StatCard
          label="Sem comprovativo"
          value={stats.pending}
          accent="red"
          icon={<FontAwesomeIcon icon={faCircleXmark} />}
        />
        <StatCard
          label="Com mesa"
          value={stats.withTable}
          sub={`${stats.total - stats.withTable} sem mesa`}
          icon={<FontAwesomeIcon icon={faChair} />}
        />
        <StatCard
          label="Com autocarro"
          value={stats.withBus}
          sub={`${stats.total - stats.withBus} sem autocarro`}
          icon={<FontAwesomeIcon icon={faBus} />}
        />
      </div>

      {/* ── Distribution charts ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <p className="mb-3 text-[0.6rem] font-bold uppercase tracking-widest text-white/30">Por ano</p>
          <div className="flex flex-col gap-2">
            {Object.entries(stats.byYear).sort().map(([yr, n]) => (
              <MiniBar key={yr} label={yr} value={n} max={stats.total} color="bg-dark-gold/60" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <p className="mb-3 text-[0.6rem] font-bold uppercase tracking-widest text-white/30">Por prato</p>
          <div className="flex flex-col gap-2">
            {Object.entries(stats.byMeal).map(([meal, n]) => (
              <MiniBar key={meal} label={meal} value={n} max={stats.total} color="bg-light-gold/50" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <p className="mb-3 text-[0.6rem] font-bold uppercase tracking-widest text-white/30">Transporte</p>
          <div className="flex flex-col gap-2">
            {Object.entries(stats.byBusOption).map(([opt, n]) => (
              <MiniBar key={opt} label={BUS_LABEL[opt] ?? opt} value={n} max={stats.total} color="bg-blue-400/40" />
            ))}
          </div>
        </div>
      </div>

      {/* ── Bus auto-assign ─────────────────────────────────────── */}
      {buses.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-4">
          <span className="text-xs font-semibold text-white/40">Auto-distribuir autocarros por</span>
          {(["year", "order"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setAutoStrategy(s)}
              className={[
                "rounded-full border px-4 py-1.5 text-xs font-semibold transition-all",
                autoStrategy === s
                  ? "border-light-gold/60 bg-light-gold/10 text-light-gold"
                  : "border-white/10 text-white/40 hover:border-white/25 hover:text-white/60",
              ].join(" ")}
            >
              {s === "year" ? "Ano de matrícula" : "Ordem de inscrição"}
            </button>
          ))}
          <button
            type="button"
            onClick={handleAutoAssign}
            disabled={assigning}
            className="ml-auto flex items-center gap-2 rounded-full border border-dark-gold/50 bg-dark-gold/10 px-4 py-1.5 text-xs font-bold text-dark-gold transition hover:bg-dark-gold/20 disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faMagicWandSparkles} />
            {assigning ? "A distribuir..." : "Distribuir automaticamente"}
          </button>
        </div>
      )}

      {/* ── Filters & search ────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-xs" />
          <input
            type="text"
            placeholder="Pesquisar por nome, email ou NMec..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/4 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-white/25 placeholder:text-white/25"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "paid", "proof", "pending"] as PaymentFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setPaymentFilter(f)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                paymentFilter === f
                  ? "border-light-gold/60 bg-light-gold/10 text-light-gold"
                  : "border-white/10 text-white/35 hover:border-white/20 hover:text-white/55",
              ].join(" ")}
            >
              {{ all: "Todos", paid: "Pagos", proof: "Comprovativo", pending: "Pendente" }[f]}
            </button>
          ))}
          <span className="mx-1 self-center text-white/15">|</span>
          {(["all", "with", "without"] as TableFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTableFilter(f)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                tableFilter === f
                  ? "border-white/30 bg-white/8 text-white/70"
                  : "border-white/10 text-white/35 hover:border-white/20 hover:text-white/55",
              ].join(" ")}
            >
              {{ all: "Todas as mesas", with: "Com mesa", without: "Sem mesa" }[f]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Export buttons ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => downloadCsv("/api/gala/v1/admin/export/registrations", "inscricoes.csv")}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-white/50 transition hover:border-white/25 hover:text-white/70"
        >
          <FontAwesomeIcon icon={faDownload} /> Exportar inscrições (CSV)
        </button>
        <button
          type="button"
          onClick={() => downloadCsv("/api/gala/v1/admin/export/tables", "mesas.csv")}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-white/50 transition hover:border-white/25 hover:text-white/70"
        >
          <FontAwesomeIcon icon={faDownload} /> Exportar mesas (CSV)
        </button>
      </div>

      {/* ── Registrants table ───────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/6">
            <tr>
              {["NMec", "Nome", "Matrícula", "Prato", "Autocarro", "Mesa", "Pagamento", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-[0.58rem] font-bold uppercase tracking-widest text-white/25">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-white/25">A carregar...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-white/25">Nenhum inscrito encontrado.</td>
              </tr>
            ) : (
              filtered.map((user) => {
                const tableName = user.table_id !== null
                  ? (tables.find((t) => t._id === user.table_id)?.name ?? `Mesa #${user.table_id}`)
                  : null;
                const busName = user.bus_assignment
                  ? (buses.find((b) => b.id === user.bus_assignment)?.name ?? user.bus_assignment)
                  : null;

                return (
                  <tr key={user._id} className="group transition-colors hover:bg-white/3">
                    <td className="px-4 py-3 font-mono text-xs text-white/50">{user.nmec}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white/80">{user.name}</p>
                      <p className="text-[0.6rem] text-white/35">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">
                      {user.matriculation ? `${user.matriculation}º` : "Outro"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {dishIcon.get(user.meal_option ?? "")}
                        {user.food_allergies && (
                          <FontAwesomeIcon icon={faHandDots} style={red} title={user.food_allergies} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">
                      {user.bus_option === "NONE" ? (
                        <span className="text-white/20">—</span>
                      ) : busName ? (
                        <span className="text-emerald-400/70">{busName}</span>
                      ) : (
                        <span className="text-yellow-400/60">Por atribuir</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">
                      {tableName ? (
                        <span className="text-white/60">{tableName}</span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.has_payed ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400/80">
                          <FontAwesomeIcon icon={faCircleCheck} /> Pago
                        </span>
                      ) : user.payment_proof_url ? (
                        <span className="flex items-center gap-1 text-xs text-yellow-400/70">
                          <FontAwesomeIcon icon={faClock} /> Comprovativo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-white/25">
                          <FontAwesomeIcon icon={faCircleXmark} /> Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openDetail(user)}
                        className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[0.6rem] font-semibold text-white/35 opacity-0 transition hover:border-white/25 hover:text-white/60 group-hover:opacity-100"
                      >
                        <FontAwesomeIcon icon={faEye} /> Ver
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p className="text-right text-[0.6rem] text-white/20">
          {filtered.length} inscrito{filtered.length !== 1 ? "s" : ""} {filtered.length !== users.length && `(de ${users.length})`}
        </p>
      )}

      {/* ── Detail dialog ───────────────────────────────────────── */}
      <dialog
        ref={detailRef}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 text-white shadow-2xl backdrop:bg-black/80"
      >
        {selectedUser && (
          <UserDetail
            user={selectedUser}
            tables={tables}
            buses={buses}
            onConfirmPayment={handleConfirmPayment}
            onAssignBus={handleAssignBus}
            onClose={() => detailRef.current?.close()}
          />
        )}
      </dialog>
    </div>
  );
}
