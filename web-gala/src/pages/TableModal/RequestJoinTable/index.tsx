import { faChair } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import Avatar from "@/components/Avatar";
import VisualTable from "@/components/Table/VisualTable";
import Button from "@/components/Button";
import useNEIUser from "@/hooks/useNEIUser";
import GuestList from "@/components/TableModal/GuestList";
import tableReserve from "@/hooks/tableHooks/useTableReserve";
import { useAppToast } from "@/components/ui/Toast";
import { extractApiError } from "@/utils/apiError";

type RequestJoinTableProps = {
  table: Table;
  mutate: () => void;
};

export default function RequestJoinTable({
  table,
  mutate,
}: Readonly<RequestJoinTableProps>) {
  const [submitting, setSubmitting] = useState(false);
  const { neiUser } = useNEIUser(table.head);
  const navigate = useNavigate();
  const toast = useAppToast();

  const handleRequest = async () => {
    setSubmitting(true);
    try {
      await tableReserve(table._id);
      toast.success("Pedido de entrada enviado!");
      mutate();
      navigate("/reserve");
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao pedir entrada na mesa."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full md:grid md:grid-cols-[1fr_min-content] md:gap-8">
      <div className="flex h-full flex-col items-center gap-8 md:items-start">
        <div className="flex w-full flex-col items-center gap-8 overflow-y-auto px-3 md:items-start">
          <div>
            <h1 className="text-3xl font-bold">{table.name}</h1>
            <div className="flex items-center">
              <h5 className="flex items-center gap-2 capitalize">
                <Avatar id={table.head} className="w-[18px]" />
                {`${neiUser?.name} ${neiUser?.surname}`}
              </h5>
            </div>
          </div>
          <VisualTable className="md:hidden" table={table} />
          <GuestList persons={table.persons} />
        </div>
        <Button
          className={classNames("mt-auto w-full", { "opacity-50": submitting })}
          onClick={handleRequest}
        >
          <FontAwesomeIcon icon={faChair} />{" "}
          {submitting ? "A enviar..." : "Pedir para entrar nesta mesa"}
        </Button>
      </div>
      <div className="flex items-center justify-center">
        <VisualTable className="hidden md:block" table={table} />
      </div>
    </div>
  );
}
