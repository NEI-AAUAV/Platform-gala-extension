import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import TableModal from "../TableModal";
import Table from "@/components/Table";
import useTables from "@/hooks/tableHooks/useTables";
import useSessionUser, { State } from "@/hooks/userHooks/useSessionUser";
import useLoginLink from "@/hooks/useLoginLink";
import useTime from "@/hooks/timeHooks/useTime";

export default function Reserve() {
  const { tableId } = useParams();
  const { tables } = useTables();
  const { state } = useSessionUser();
  useTime();

  useEffect(() => {
    if (!tableId) document.body.style.overflow = "";
  }, [tableId]);

  const loginLink = useLoginLink();

  const header = {
    [State.NONE]: {
      text: "Inicia sessão para escolheres a tua mesa.",
      label: "Iniciar sessão",
      link: loginLink,
    },
    [State.AUTHENTICATED]: {
      text: "Efetua a inscrição para escolheres a tua mesa.",
      label: "Efetuar inscrição",
      link: "/register",
    },
    [State.REGISTERED]: {
      text: "Escolhe a tua mesa.",
    },
  };

  return (
    <>
      <div className="m-20 text-center">
        <p className="block text-2xl font-bold text-white/80">
          {header[state].text}
        </p>
        {header[state].link && (
          <Link
            className="mt-4 inline-block border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black"
            to={header[state].link || ""}
          >
            {header[state].label}
          </Link>
        )}
      </div>
      <div className="m-10 grid grid-cols-[repeat(auto-fit,_minmax(13.25rem,_1fr))] gap-14">
        {tables?.map((table) => {
          const location = `/reserve/${table._id}`;
          return (
            <Link key={table._id} to={location}>
              <Table table={table} />
            </Link>
          );
        })}
      </div>
      {tableId !== undefined && <TableModal tableId={Number(tableId)} />}
    </>
  );
}
