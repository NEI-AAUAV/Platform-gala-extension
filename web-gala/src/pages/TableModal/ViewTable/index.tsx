import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  faChair,
  faUser,
  faCheck,
  faXmark,
  faBell,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Avatar from "@/components/Avatar";
import VisualTable from "@/components/Table/VisualTable";
import GuestList from "@/components/TableModal/GuestList";
import useTableLeave from "@/hooks/tableHooks/useTableLeave";
import useNEIUser from "@/hooks/useNEIUser";
import { useAppToast } from "@/components/ui/Toast";
import { extractApiError } from "@/utils/apiError";
import GalaService from "@/services/GalaService";

type ViewTableProps = {
  readonly table: Table;
  readonly mutate: () => void;
  readonly inTable?: boolean;
  readonly isInvited?: boolean;
};

export default function ViewTable({
  table,
  inTable = false,
  mutate,
  isInvited = false,
}: ViewTableProps) {
  const { neiUser } = useNEIUser(table.head ?? null);
  const navigate = useNavigate();
  const toast = useAppToast();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await GalaService.table.acceptInvite(table._id, {});
      toast.success("Entraste na mesa!");
      mutate();
      navigate("/reserve");
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao aceitar convite."));
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      const me = await GalaService.user.getSessionUser();
      await GalaService.table.revokeInvite(table._id, me._id);
      toast.success("Convite recusado.");
      mutate();
      navigate("/reserve");
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao recusar convite."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="md:grid md:h-full md:grid-cols-[1fr_min-content] md:gap-12">
      <div className="flex min-w-[20rem] flex-col gap-8">
        {/* Table Identity Header */}
        <div className="space-y-4">
          <div className="flex w-fit items-center gap-2 rounded-full border border-dark-gold/20 bg-dark-gold/10 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-dark-gold">
            <FontAwesomeIcon icon={faChair} className="w-3" /> Mesa #{table._id}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            {table.name || "Mesa sem nome"}
          </h1>
          {neiUser && (
            <div className="flex items-center gap-2 text-white/40">
              <span className="text-[0.65rem] font-bold uppercase tracking-widest text-white/20">
                Head:
              </span>
              <Avatar
                id={neiUser.id}
                className="w-4 rounded-full border border-white/10"
              />
              <span className="text-xs font-semibold text-white/60">{`${neiUser.name} ${neiUser.surname}`}</span>
            </div>
          )}
        </div>

        {/* Invite banner */}
        {isInvited && (
          <div className="flex items-start gap-3 rounded-xl border border-light-gold/30 bg-light-gold/5 px-4 py-3">
            <FontAwesomeIcon
              icon={faBell}
              className="mt-0.5 shrink-0 text-light-gold"
            />
            <div>
              <p className="text-sm font-bold text-light-gold">
                Foste convidado para esta mesa!
              </p>
              <p className="text-xs text-white/40">
                Aceita ou recusa o convite abaixo.
              </p>
            </div>
          </div>
        )}

        {/* Group Photo Section */}
        {table.photo_url && (
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <img
              src={table.photo_url}
              alt={table.name || "Mesa"}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Guest List */}
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
            <FontAwesomeIcon icon={faUser} /> Convidados na Mesa
          </h4>
          <div className="border-white/6 bg-white/2 rounded-xl border p-2">
            <GuestList persons={table.persons} />
          </div>
        </div>

        {/* Actions */}
        {(() => {
          if (isInvited) {
            return (
              <div className="mt-auto flex gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleDecline}
                  className="flex-1 rounded-xl border border-white/20 py-3 text-xs font-bold uppercase tracking-widest text-white/40 transition-all hover:border-red-400/40 hover:text-red-400 disabled:opacity-40"
                >
                  <FontAwesomeIcon icon={faXmark} className="mr-2" />
                  Recusar
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleAccept}
                  className="flex-1 rounded-xl border border-light-gold/60 py-3 text-xs font-bold uppercase tracking-widest text-light-gold transition-all hover:bg-light-gold hover:text-black disabled:opacity-40"
                >
                  <FontAwesomeIcon icon={faCheck} className="mr-2" />
                  Aceitar
                </button>
              </div>
            );
          }
          if (inTable) {
            return (
              <button
                type="button"
                className="mt-auto w-full rounded-xl border border-red-500/30 bg-red-500/5 py-3 text-xs font-bold uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300"
                onClick={async () => {
                  await useTableLeave(table._id);
                  mutate();
                  navigate("/reserve");
                }}
              >
                Abandonar Mesa
              </button>
            );
          }
          return null;
        })()}
      </div>

      <div className="flex items-center justify-center">
        <VisualTable className="hidden max-h-[400px] md:block" table={table} />
        <VisualTable className="w-min md:hidden" table={table} />
      </div>
    </div>
  );
}
