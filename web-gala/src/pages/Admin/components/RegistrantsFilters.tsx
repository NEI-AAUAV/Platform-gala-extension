import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";

export type PaymentFilter =
  | "all"
  | "paid"
  | "partial"
  | "proof"
  | "pending"
  | "expired";
export type TableFilter = "all" | "with" | "without";

interface RegistrantsFiltersProps {
  search: string;
  setSearch: (s: string) => void;
  paymentFilter: PaymentFilter;
  setPaymentFilter: (f: PaymentFilter) => void;
  tableFilter: TableFilter;
  setTableFilter: (f: TableFilter) => void;
}

export default function RegistrantsFilters({
  search,
  setSearch,
  paymentFilter,
  setPaymentFilter,
  tableFilter,
  setTableFilter,
}: Readonly<RegistrantsFiltersProps>) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <FontAwesomeIcon
          icon={faSearch}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-white/20"
        />
        <input
          type="text"
          placeholder="Pesquisar por nome, email ou NMec..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white/4 w-full rounded-xl border border-white/10 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            "all",
            "paid",
            "partial",
            "proof",
            "pending",
            "expired",
          ] as PaymentFilter[]
        ).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setPaymentFilter(f)}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
              paymentFilter === f
                ? "border-light-gold/60 bg-light-gold/10 text-light-gold"
                : "text-white/35 hover:text-white/55 border-white/10 hover:border-white/20",
            ].join(" ")}
          >
            {
              {
                all: "Todos",
                paid: "Pagos",
                partial: "Parcial",
                proof: "Por rever",
                pending: "Pendente",
                expired: "Expirados",
              }[f]
            }
          </button>
        ))}
        <span className="text-white/15 mx-1 self-center">|</span>
        {(["all", "with", "without"] as TableFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setTableFilter(f)}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
              tableFilter === f
                ? "bg-white/8 border-white/30 text-white/70"
                : "text-white/35 hover:text-white/55 border-white/10 hover:border-white/20",
            ].join(" ")}
          >
            {
              { all: "Todas as mesas", with: "Com mesa", without: "Sem mesa" }[
                f
              ]
            }
          </button>
        ))}
      </div>
    </div>
  );
}
