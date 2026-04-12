import { useNavigate } from "react-router-dom";
import { faChair, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Avatar from "@/components/Avatar";
import VisualTable from "@/components/Table/VisualTable";
import GuestList from "@/components/TableModal/GuestList";
import useTableLeave from "@/hooks/tableHooks/useTableLeave";
import useNEIUser from "@/hooks/useNEIUser";

interface ViewTableProps {
  readonly table: Table;
  readonly mutate: () => void;
  readonly inTable?: boolean;
}

export default function ViewTable({ table, inTable = false, mutate }: Readonly<ViewTableProps>) {
  const { neiUser } = useNEIUser(table.head ?? null);
  const navigate = useNavigate();

  return (
    <div className="md:grid md:h-full md:grid-cols-[1fr_min-content] md:gap-12">
      <div className="flex min-w-[20rem] flex-col gap-8">
        {/* Table Identity Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-full border border-dark-gold/20 bg-dark-gold/10 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-dark-gold w-fit">
            <FontAwesomeIcon icon={faChair} className="w-3" /> Mesa #{table._id}
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            {table.name || "Mesa sem nome"}
          </h1>
          {neiUser && (
            <div className="flex items-center gap-2 text-white/40">
              <span className="text-[0.65rem] font-bold uppercase tracking-widest text-white/20">Head:</span>
              <Avatar id={neiUser.id} className="w-4 rounded-full border border-white/10" />
              <span className="text-xs font-semibold text-white/60">{`${neiUser.name} ${neiUser.surname}`}</span>
            </div>
          )}
        </div>

        {/* Group Photo Section (if exists) */}
        {table.photo_path && (
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
             <img 
               src={table.photo_path} 
               alt={table.name || "Mesa"} 
               className="h-full w-full object-cover"
             />
          </div>
        )}

        {/* Guest List section with themed heading */}
        <div className="space-y-4">
           <h4 className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
              <FontAwesomeIcon icon={faUser} /> Convidados na Mesa
           </h4>
           <div className="rounded-xl border border-white/6 bg-white/2 p-2">
              <GuestList persons={table.persons} />
           </div>
        </div>

        {/* Table Actions */}
        {inTable && (
          <button
            className="mt-auto w-full rounded-xl border border-red-500/30 bg-red-500/5 py-3 text-xs font-bold uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300"
            onClick={async () => {
              await useTableLeave(table._id);
              mutate();
              navigate("/reserve");
            }}
          >
            Abandonar Mesa
          </button>
        )}
      </div>

      <div className="flex items-center justify-center">
        <VisualTable className="hidden max-h-[400px] md:block" table={table} />
        <VisualTable className="w-min md:hidden" table={table} />
      </div>
    </div>
  );
}
