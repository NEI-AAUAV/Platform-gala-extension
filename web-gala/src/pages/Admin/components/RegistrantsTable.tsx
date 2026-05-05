import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faHandDots,
  faCircleCheck,
  faClock,
  faCircleXmark,
  faCircleHalfStroke,
  faTriangleExclamation,
  faGhost,
} from "@fortawesome/free-solid-svg-icons";
import { FrangoIcon } from "@/assets/icons";

const orange = { color: "#DD8500" };
const green = { color: "#198754" };
const red = { color: "#DC3545" };

const dishIcon = new Map<string, React.ReactNode>([
  ["NOR", <FrangoIcon key="NOR" style={orange} />],
  [
    "VEG",
    <span key="VEG" style={green}>
      🥬
    </span>,
  ],
]);

interface RegistrantsTableProps {
  readonly loading: boolean;
  readonly filtered: User[];
  readonly tables: Table[];
  readonly buses: { id: string; name: string; capacity: number }[];
  readonly openDetail: (user: User) => void;
}

export default function RegistrantsTable({
  loading,
  filtered,
  tables,
  buses,
  openDetail,
}: RegistrantsTableProps) {
  return (
    <div className="border-white/8 overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead className="border-white/6 border-b">
          <tr>
            {[
              "NMec",
              "Nome",
              "Matrícula",
              "Prato",
              "Autocarro",
              "Mesa",
              "Pagamento",
              "",
            ].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-[0.58rem] font-bold uppercase tracking-widest text-white/25"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-white/4 divide-y">
          {(() => {
            if (loading) {
              return (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-white/25"
                  >
                    A carregar...
                  </td>
                </tr>
              );
            }
            if (filtered.length === 0) {
              return (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-white/25"
                  >
                    Nenhum inscrito encontrado.
                  </td>
                </tr>
              );
            }
            return filtered.map((user) => {
              let tableName: string | null = null;
              if (user.table_id !== null) {
                tableName =
                  tables.find((t) => t._id === user.table_id)?.name ??
                  `Mesa #${user.table_id}`;
              }

              const busName = user.bus_assignment
                ? buses.find((b) => b.id === user.bus_assignment)?.name ??
                  user.bus_assignment
                : null;
              const hasReviewProof =
                (!user.payment_phase1_confirmed &&
                  Boolean(user.payment_proof_url)) ||
                (user.phased_payment &&
                  !user.payment_phase2_confirmed &&
                  Boolean(user.payment_proof_url_phase2));
              const isPartiallyPaid =
                user.phased_payment &&
                user.payment_phase1_confirmed &&
                !user.has_payed;

              return (
                <tr
                  key={user._id}
                  className="hover:bg-white/3 group transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-white/50">
                    {user.nmec}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white/80">{user.name}</p>
                      {user.admin_created && (
                        <FontAwesomeIcon
                          icon={faGhost}
                          className="text-[0.6rem] text-white/20"
                          title="Inscrição manual (sem conta)"
                        />
                      )}
                    </div>
                    <p className="text-white/35 text-[0.6rem]">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/50">
                    {user.matriculation ? `${user.matriculation}º` : "Outro"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {dishIcon.get(user.meal_option ?? "")}
                      {user.food_allergies && (
                        <FontAwesomeIcon
                          icon={faHandDots}
                          style={red}
                          title={user.food_allergies}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/50">
                    {(() => {
                      if (user.bus_option === "NONE")
                        return <span className="text-white/20">—</span>;
                      if (busName)
                        return (
                          <span className="text-emerald-400/70">{busName}</span>
                        );
                      return (
                        <span className="text-yellow-400/60">Por atribuir</span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-xs text-white/50">
                    {tableName ? (
                      <span className="text-white/60">{tableName}</span>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      if (user.has_payed) {
                        return (
                          <span className="flex items-center gap-1 text-xs text-emerald-400/80">
                            <FontAwesomeIcon icon={faCircleCheck} /> Pago
                          </span>
                        );
                      }
                      if (isPartiallyPaid) {
                        return (
                          <span className="flex items-center gap-1 text-xs text-sky-400/75">
                            <FontAwesomeIcon icon={faCircleHalfStroke} />{" "}
                            Parcial
                          </span>
                        );
                      }
                      if (hasReviewProof) {
                        return (
                          <span className="flex items-center gap-1 text-xs text-yellow-400/70">
                            <FontAwesomeIcon icon={faClock} /> Por rever
                          </span>
                        );
                      }
                      if (
                        user.payment_expired ||
                        user.registration_active === false
                      ) {
                        return (
                          <span className="flex items-center gap-1 text-xs text-red-400/70">
                            <FontAwesomeIcon icon={faTriangleExclamation} />{" "}
                            Expirado
                          </span>
                        );
                      }
                      return (
                        <span className="flex items-center gap-1 text-xs text-white/25">
                          <FontAwesomeIcon icon={faCircleXmark} /> Pendente
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openDetail(user)}
                      className="text-white/35 flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[0.6rem] font-semibold opacity-0 transition hover:border-white/25 hover:text-white/60 group-hover:opacity-100"
                    >
                      <FontAwesomeIcon icon={faEye} /> Ver
                    </button>
                  </td>
                </tr>
              );
            });
          })()}
        </tbody>
      </table>
    </div>
  );
}
