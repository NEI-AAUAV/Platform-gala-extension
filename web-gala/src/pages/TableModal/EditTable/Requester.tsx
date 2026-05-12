import {
  faCheck,
  faHandDots,
  faSeedling,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Avatar from "@/components/Avatar";
import useNEIUser from "@/hooks/useNEIUser";
import tableConfirm from "@/hooks/tableHooks/useTableConfirm";
import tableUserRemove from "@/hooks/tableHooks/useTableUserRemove";
import { FrangoIcon } from "@/assets/icons";
import { useAppToast } from "@/components/ui/Toast";
import { extractApiError } from "@/utils/apiError";

type RequesterProps = {
  person: Person;
  tableId: number;
  mutate: () => void;
};

const orange = { color: "#DD8500" };
const green = { color: "#198754" };
const red = { color: "#DC3545" };
const iconMap = new Map([
  ["NOR", <FrangoIcon style={orange} />],
  ["VEG", <FontAwesomeIcon icon={faSeedling} style={green} />],
]);

function allergyIcon(allergies: string) {
  return (
    allergies.length > 0 && <FontAwesomeIcon icon={faHandDots} style={red} />
  );
}

function countVegetarians(person: Person) {
  return person.companions.filter((companion) => companion.dish === "VEG")
    .length;
}

function countNormal(person: Person) {
  return person.companions.filter((companion) => companion.dish === "NOR")
    .length;
}

function countAllergies(person: Person) {
  return person.companions.filter((companion) => companion.allergies.length > 0)
    .length;
}

const gridTemplate = {
  gridTemplateColumns: "max-content 1fr",
};

export default function Requester({ person, tableId, mutate }: RequesterProps) {
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
        {/* <Guest id={person.id} /> */}
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
        {/* Companions */}
        {person.companions.length > 0 && (
          <>
            <div />
            <div className="flex items-center gap-2 font-light">
              <span>{`+${person.companions.length} companions`}</span>
              <span className="flex items-center gap-2">
                {countNormal(person) > 0 && (
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-base-content/70">
                      {countNormal(person)}
                    </span>
                    <FrangoIcon style={orange} />
                  </span>
                )}
                {countVegetarians(person) > 0 && (
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-base-content/70">
                      {countVegetarians(person)}
                    </span>
                    <FontAwesomeIcon icon={faSeedling} style={green} />
                  </span>
                )}
                {countAllergies(person) > 0 && (
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-base-content/70">
                      {countAllergies(person)}
                    </span>
                    <FontAwesomeIcon icon={faHandDots} style={red} />
                  </span>
                )}
              </span>
            </div>
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
