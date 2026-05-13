import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Avatar from "@/components/Avatar";
import useNEIUser from "@/hooks/useNEIUser";
import tableConfirm from "@/hooks/tableHooks/useTableConfirm";
import tableUserRemove from "@/hooks/tableHooks/useTableUserRemove";
import { useAppToast } from "@/components/ui/Toast";
import { extractApiError } from "@/utils/apiError";
import {
  iconMap,
  allergyIcon,
  gridTemplate,
  CompanionSummary,
} from "@/components/TableModal/personUtils";

type RequesterProps = {
  person: Person;
  tableId: number;
  mutate: () => void;
};

export default function Requester({
  person,
  tableId,
  mutate,
}: Readonly<RequesterProps>) {
  const { neiUser } = useNEIUser(person.id);
  const rejectConfirmModalRef = useRef<HTMLDialogElement>(null);
  const toast = useAppToast();

  async function acceptGuest(userId: number) {
    try {
      await tableConfirm(tableId, { uid: userId, confirm: true });
      toast.success("Pedido aceite!");
      mutate();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao aceitar pedido."));
    }
  }

  function modalRejectConfirm() {
    rejectConfirmModalRef.current!.showModal();
  }

  async function rejectGuest(userId: number) {
    try {
      await tableUserRemove(tableId, userId);
      toast.success("Pedido rejeitado.");
      mutate();
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao rejeitar pedido."));
    }
  }

  return (
    <>
      <div className="grid items-center gap-2" style={gridTemplate}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-light-gold p-1"
              onClick={() => acceptGuest(person.id)}
            >
              <FontAwesomeIcon icon={faCheck} />
            </button>
            <button
              className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-light-gold p-1"
              type="button"
              onClick={() => modalRejectConfirm()}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          <Avatar id={person.id} className="w-[18px]" />
        </div>
        <div className="flex items-center gap-2">
          <span>{`${neiUser?.name} ${neiUser?.surname}`}</span>
          <span className="flex gap-2">
            {iconMap.get(person.dish)}
            {allergyIcon(person.allergies)}
          </span>
        </div>
        {person.companions.length > 0 && (
          <>
            <div />
            <CompanionSummary person={person} />
          </>
        )}
      </div>
      <dialog
        className="overflow-hidden rounded-3xl p-0 backdrop:bg-black backdrop:opacity-50"
        ref={rejectConfirmModalRef}
      >
        <h2 className="border-b border-black/20 p-8">
          Tens a certeza que queres rejeitar o pedido?
        </h2>
        <div className="grid grid-cols-2">
          <button
            type="button"
            className="border-r border-black/20 p-4 "
            onClick={() => {
              rejectConfirmModalRef.current!.close();
              rejectGuest(person.id);
            }}
          >
            Sim
          </button>
          <button
            type="button"
            className="p-4"
            onClick={() => rejectConfirmModalRef.current!.close()}
          >
            Não
          </button>
        </div>
      </dialog>
    </>
  );
}
