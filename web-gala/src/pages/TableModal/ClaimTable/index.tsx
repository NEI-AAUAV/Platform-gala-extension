import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { faPlus, faChair } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import VisualTable from "@/components/Table/VisualTable";
import Avatar from "@/components/Avatar";
import { useAppToast } from "@/components/ui/Toast";
import { extractApiError } from "@/utils/apiError";
import GalaService from "@/services/GalaService";

type ClaimTableProps = {
  table: Table;
  mutate: () => void;
};

export default function ClaimTable({
  table,
  mutate,
}: Readonly<ClaimTableProps>) {
  const [tableName, setTableName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const navigate = useNavigate();
  const toast = useAppToast();

  const handleClaim = async () => {
    const trimmed = tableName.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      setNameError("O nome deve ter entre 3 e 20 caracteres.");
      return;
    }
    setNameError(null);
    setSubmitting(true);
    try {
      await GalaService.table.reserveTable(table._id, {
        dish: "NOR",
        allergies: "",
        companions: [],
      });
      try {
        await GalaService.table.editTable(table._id, { name: trimmed });
        toast.success("Mesa criada com sucesso!");
      } catch {
        toast.error(
          "Mesa criada, mas não foi possível definir o nome. Edita-o depois.",
        );
      }
      mutate();
      navigate("/reserve");
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao criar mesa."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="md:grid md:h-[max(100%,auto)] md:grid-cols-[1fr_min-content] md:gap-8">
      <div className="flex w-full flex-col gap-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex w-fit items-center gap-2 rounded-full border border-light-gold/20 bg-light-gold/10 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-light-gold">
            <FontAwesomeIcon icon={faChair} className="w-3" />
            Mesa #{table._id}
          </div>
          <div>
            <p className="text-sm text-white/50">
              Esta mesa está livre. Reserva-a e torna-te o seu responsável.
            </p>
          </div>
        </div>

        {/* Owner badge */}
        <div className="flex items-center gap-3 border border-light-gold/20 bg-light-gold/5 px-4 py-3">
          <Avatar className="w-8 rounded-full border border-light-gold/20" />
          <div>
            <p className="text-xs font-bold text-light-gold">
              Serás o dono da mesa
            </p>
            <p className="text-[0.6rem] text-white/30">
              Podes convidar outros inscritos depois de a criar.
            </p>
          </div>
        </div>

        {/* Table name input */}
        <div className="space-y-2">
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label
            htmlFor="table-name"
            className="text-[0.65rem] font-bold uppercase tracking-widest text-white/30"
          >
            Nome da Mesa
          </label>
          <input
            id="table-name"
            type="text"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="Ex: Os Fixolas, Mesa A, ..."
            maxLength={20}
            className="border-white/15 w-full border bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-light-gold/40"
          />
          {nameError && <p className="text-xs text-red-400">{nameError}</p>}
        </div>

        {/* Visual table preview on mobile */}
        <div className="flex justify-center md:hidden">
          <VisualTable table={table} alwaysVisible />
        </div>

        {/* Submit */}
        <button
          type="button"
          disabled={submitting}
          onClick={handleClaim}
          className="mt-auto flex w-full items-center justify-center gap-2 border border-light-gold/60 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FontAwesomeIcon icon={faPlus} />
          {submitting ? "A criar..." : "Criar Mesa"}
        </button>
      </div>

      <div className="hidden items-center justify-center md:flex">
        <VisualTable table={table} alwaysVisible />
      </div>
    </div>
  );
}
