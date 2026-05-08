import { useEffect, useRef, useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faPlus } from "@fortawesome/free-solid-svg-icons";
import GalaService from "@/services/GalaService";
import { useHomepageConfig } from "@/hooks/useHomepageConfig";
import useTables from "@/hooks/tableHooks/useTables";
import { useAppToast } from "@/components/ui/Toast";
import { extractApiError } from "@/utils/apiError";
import { downloadCsv } from "@/utils/csvExport";
import { computeStats } from "@/utils/registrantsStats";

import AdminRegistrationForm from "./components/AdminRegistrationForm";
import UserDetail from "./components/UserDetail";
import RegistrantsTable from "./components/RegistrantsTable";
import RegistrantsStatsGrid from "./components/RegistrantsStatsGrid";
import RegistrantsCharts from "./components/RegistrantsCharts";
import RegistrantsFilters, {
  PaymentFilter,
  TableFilter,
} from "./components/RegistrantsFilters";
import RegistrantsAutoAssign from "./components/RegistrantsAutoAssign";

export default function RegistrantsAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [tableFilter, setTableFilter] = useState<TableFilter>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [autoStrategy, setAutoStrategy] = useState<"year" | "order">("year");
  const [assigning, setAssigning] = useState(false);
  const [formUser, setFormUser] = useState<User | null | undefined>(undefined);

  const [uploadingProof, setUploadingProof] = useState(false);

  const detailRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLDialogElement>(null);
  const toast = useAppToast();
  const { config } = useHomepageConfig();
  const { tables } = useTables();
  const { buses } = config.bus_schedule;

  const load = async () => {
    setLoading(true);
    try {
      const data = await GalaService.admin.listRegistrations();
      setUsers(data);
      setSelectedUser((prev) =>
        prev ? data.find((u) => u._id === prev._id) || null : null,
      );
    } catch {
      toast.error("Erro ao carregar inscritos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => computeStats(users), [users]);

  const filtered = useMemo(() => {
    const matchesSearch = (u: User, q: string) => {
      const lowerQ = q.toLowerCase();
      return (
        u.name.toLowerCase().includes(lowerQ) ||
        u.email.toLowerCase().includes(lowerQ) ||
        String(u.nmec).includes(lowerQ)
      );
    };

    const matchesPayment = (u: User, filter: string) => {
      if (filter === "all") return true;

      const hasReviewProof =
        (!u.payment_phase1_confirmed && Boolean(u.payment_proof_url)) ||
        (u.phased_payment &&
          !u.payment_phase2_confirmed &&
          Boolean(u.payment_proof_url_phase2));
      const partiallyPaid =
        u.phased_payment && u.payment_phase1_confirmed && !u.has_payed;

      switch (filter) {
        case "paid":
          return u.has_payed;
        case "partial":
          return partiallyPaid;
        case "proof":
          return !u.has_payed && hasReviewProof;
        case "expired":
          return u.payment_expired;
        case "pending":
          return (
            !u.has_payed &&
            !hasReviewProof &&
            !partiallyPaid &&
            !u.payment_expired
          );
        default:
          return true;
      }
    };

    const matchesTable = (u: User, filter: string) => {
      if (filter === "with") return u.table_id !== null;
      if (filter === "without") return u.table_id === null;
      return true;
    };

    return users.filter((u) => {
      if (search && !matchesSearch(u, search)) return false;
      if (!matchesPayment(u, paymentFilter)) return false;
      if (!matchesTable(u, tableFilter)) return false;
      return true;
    });
  }, [users, search, paymentFilter, tableFilter]);

  const openDetail = (user: User) => {
    setSelectedUser(user);
    detailRef.current?.showModal();
  };

  const openForm = (user?: User) => {
    setFormUser(user || null);
    if (user) detailRef.current?.close();
    formRef.current?.showModal();
  };

  const closeForm = () => {
    formRef.current?.close();
    setFormUser(undefined);
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    if (
      !confirm(
        `Tem a certeza que deseja eliminar a inscrição de ${selectedUser.name}? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    try {
      await GalaService.admin.deleteRegistration(selectedUser._id);
      toast.success("Inscrição eliminada com sucesso.");
      detailRef.current?.close();
      load();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao eliminar inscrição."));
    }
  };

  const handleConfirmPayment = async (phase?: number) => {
    if (!selectedUser) return;
    try {
      await GalaService.admin.confirmPayment(selectedUser._id, phase);
      toast.success(
        phase ? `Fase ${phase} confirmada!` : "Pagamento confirmado!",
      );
      load();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao confirmar pagamento."));
    }
  };

  const handlePaymentReminder = async () => {
    if (!selectedUser) return;
    try {
      await GalaService.admin.sendPaymentReminder(selectedUser._id);
      toast.success("Lembrete de pagamento enviado.");
      load();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao enviar lembrete."));
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

  const handleAssignTable = async (tableId: string | null) => {
    if (!selectedUser) return;
    try {
      if (tableId) {
        if (selectedUser.table_id === null) {
          // Add to new table
          await GalaService.admin.addMemberToTable(
            Number(tableId),
            selectedUser._id,
          );
        } else {
          // Move table
          await GalaService.admin.moveMemberToTable(
            Number(tableId),
            selectedUser._id,
          );
        }
      } else if (selectedUser.table_id) {
        // Remove from current table
        await GalaService.admin.removeMemberFromTable(
          selectedUser.table_id,
          selectedUser._id,
        );
      }
      toast.success("Mesa atualizada com sucesso.");
      load();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao atualizar mesa."));
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

  const handleUploadProof = async (phase: number, file: File) => {
    if (!selectedUser) return;
    setUploadingProof(true);
    try {
      await GalaService.admin.uploadPaymentProof(selectedUser._id, phase, file);
      toast.success("Comprovativo enviado com sucesso.");
      load();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao enviar comprovativo."));
    } finally {
      setUploadingProof(false);
    }
  };

  const handleRejectProof = async (phase: number) => {
    if (!selectedUser) return;
    if (
      !confirm(
        `Tem a certeza que deseja rejeitar o comprovativo (fase ${phase}) e notificar o utilizador por email?`,
      )
    )
      return;
    try {
      await GalaService.admin.rejectPaymentProof(selectedUser._id, phase);
      toast.success("Comprovativo rejeitado com sucesso.");
      load();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao rejeitar comprovativo."));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => openForm()}
          className="flex items-center gap-2 rounded-xl bg-dark-gold px-4 py-2 text-sm font-bold text-black transition hover:bg-yellow-600"
        >
          <FontAwesomeIcon icon={faPlus} />
          Nova Inscrição
        </button>
      </div>

      <RegistrantsStatsGrid stats={stats} />
      <RegistrantsCharts stats={stats} />

      <RegistrantsAutoAssign
        busesLength={buses.length}
        autoStrategy={autoStrategy}
        setAutoStrategy={setAutoStrategy}
        assigning={assigning}
        handleAutoAssign={handleAutoAssign}
      />

      <RegistrantsFilters
        search={search}
        setSearch={setSearch}
        paymentFilter={paymentFilter}
        setPaymentFilter={setPaymentFilter}
        tableFilter={tableFilter}
        setTableFilter={setTableFilter}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            downloadCsv(
              "/api/gala/v1/admin/export/registrations",
              "inscricoes.csv",
            )
          }
          className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-white/50 transition hover:border-white/25 hover:text-white/70"
        >
          <FontAwesomeIcon icon={faDownload} /> Exportar inscrições (CSV)
        </button>
        <button
          type="button"
          onClick={() =>
            downloadCsv("/api/gala/v1/admin/export/tables", "mesas.csv")
          }
          className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-white/50 transition hover:border-white/25 hover:text-white/70"
        >
          <FontAwesomeIcon icon={faDownload} /> Exportar mesas (CSV)
        </button>
      </div>

      <RegistrantsTable
        loading={loading}
        filtered={filtered}
        tables={tables}
        buses={buses}
        openDetail={openDetail}
      />

      {filtered.length < users.length && (
        <p className="text-right text-[0.6rem] text-white/20">
          {filtered.length} inscrito{filtered.length === 1 ? "" : "s"} (de{" "}
          {users.length})
        </p>
      )}

      <dialog
        ref={detailRef}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 text-white shadow-2xl backdrop:bg-black/80"
      >
        {selectedUser && (
          <UserDetail
            user={selectedUser}
            tables={tables}
            buses={buses}
            uploadingProof={uploadingProof}
            onConfirmPayment={handleConfirmPayment}
            onSendPaymentReminder={handlePaymentReminder}
            onAssignBus={handleAssignBus}
            onEdit={() => openForm(selectedUser)}
            onDelete={handleDelete}
            onClose={() => detailRef.current?.close()}
            onUploadProof={handleUploadProof}
            onRejectProof={handleRejectProof}
            onAssignTable={handleAssignTable}
          />
        )}
      </dialog>

      <dialog
        ref={formRef}
        className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 text-white shadow-2xl backdrop:bg-black/80"
      >
        {formUser !== undefined && (
          <AdminRegistrationForm
            userToEdit={formUser}
            onClose={closeForm}
            onSuccess={() => {
              closeForm();
              load();
            }}
          />
        )}
      </dialog>
    </div>
  );
}
