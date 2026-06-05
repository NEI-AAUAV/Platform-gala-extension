import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faSpinner,
  faCrown,
  faCheckCircle,
  faUsers,
  faChartPie,
} from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from "framer-motion";
import GalaService, { type AdminVoteCategory } from "@/services/GalaService";

interface NomineeWithScore {
  name: string;
  score: number;
  photo?: string;
}

function VoteResults() {
  const [data, setData] = useState<AdminVoteCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = () => {
      GalaService.admin
        .listVotingCategories()
        .then((res) => {
          setData(res);
          setFetchError(false);
        })
        .catch(() => {
          setFetchError(true);
        })
        .finally(() => {
          setLoading(false);
        });
    };

    // Fetch data initially
    fetchData();

    // Set up interval to fetch data every 2.5 seconds
    const interval = setInterval(fetchData, 2500);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  // Filter categories by search term
  const filteredData = data.filter(
    (item) =>
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  // Global calculations
  const totalCategories = data.length;
  const totalVotesCast = data.reduce(
    (sum, item) => sum + (item.votes?.length ?? 0),
    0,
  );

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-white/50">
        <FontAwesomeIcon
          icon={faSpinner}
          className="animate-spin text-lg text-dark-gold"
        />
        <span>A carregar resultados da votação...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top dashboard summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-light-gold/10 bg-black/25 p-5 shadow-md backdrop-blur-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-dark-gold/10 text-dark-gold">
            <FontAwesomeIcon icon={faChartPie} className="text-xl" />
          </div>
          <div>
            <p className="text-[0.6rem] font-medium uppercase tracking-widest text-white/40">
              Categorias de Votação
            </p>
            <p className="mt-0.5 font-gala text-2xl font-bold text-white/95">
              {totalCategories}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-light-gold/10 bg-black/25 p-5 shadow-md backdrop-blur-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-dark-gold/10 text-dark-gold">
            <FontAwesomeIcon icon={faUsers} className="text-xl" />
          </div>
          <div>
            <p className="text-[0.6rem] font-medium uppercase tracking-widest text-white/40">
              Total de Votos Registados
            </p>
            <p className="mt-0.5 font-gala text-2xl font-bold text-white/95">
              {totalVotesCast}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Alert Bar */}
      <div className="flex flex-col items-center justify-between gap-3 border-b border-light-gold/10 pb-4 sm:flex-row">
        <div className="relative w-full sm:max-w-xs">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-white/30"
          />
          <input
            type="text"
            placeholder="Pesquisar categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-light-gold/15 focus:border-dark-gold/45 w-full rounded-full border bg-black/30 py-2 pl-9 pr-4 text-xs text-white placeholder-white/30 outline-none transition-all duration-300 focus:bg-black/40"
          />
        </div>

        {fetchError && (
          <span className="flex animate-pulse items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[0.65rem] text-red-400">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
            {" "}
            Erro na ligação. A tentar restabelecer ligação...
          </span>
        )}
      </div>

      {/* Grid of Results */}
      {filteredData.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-black/20 p-8 text-center text-sm text-white/40">
          Nenhuma categoria encontrada para &quot;{searchTerm}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filteredData.map((item) => {
              // Calculate scores dynamically from raw votes list
              const scores = new Array(item.options.length).fill(0);
              if (item.votes) {
                item.votes.forEach((v) => {
                  if (v.option >= 0 && v.option < scores.length) {
                    scores[v.option]++;
                  }
                });
              }

              const totalCatVotes = scores.reduce((a, b) => a + b, 0);

              // Map nominees with their scores
              const nominees: NomineeWithScore[] = item.options.map(
                (opt, idx) => ({
                  name: opt,
                  score: scores[idx] ?? 0,
                  photo: item.photo_paths?.[idx],
                }),
              );

              // Sort from highest score to lowest
              const sortedNominees = [...nominees].sort(
                (a, b) => b.score - a.score,
              );

              return (
                <motion.div
                  key={item._id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4 rounded-2xl border border-light-gold/10 bg-[#162725]/40 p-5 shadow-lg backdrop-blur-sm transition-all duration-500 hover:border-light-gold/25"
                >
                  <div>
                    <h3 className="font-gala text-base font-bold leading-tight text-dark-gold">
                      {item.category}
                    </h3>
                    {item.description && (
                      <p className="mt-1 text-[0.7rem] leading-snug text-white/40">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-2 flex flex-1 flex-col gap-3.5">
                    {totalCatVotes === 0 ? (
                      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-light-gold/10 px-4 py-8 text-center">
                        <span className="text-[0.7rem] text-white/25">
                          Ainda sem votos registados nesta categoria.
                        </span>
                      </div>
                    ) : (
                      sortedNominees.map((nominee, idx) => {
                        const pct =
                          totalCatVotes > 0
                            ? Math.round((nominee.score / totalCatVotes) * 100)
                            : 0;
                        const isLeader = idx === 0 && nominee.score > 0;

                        return (
                          <div
                            key={nominee.name}
                            className="flex items-center gap-3"
                          >
                            {/* Avatar */}
                            <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border border-dark-gold/30 bg-black/40 shadow-inner">
                              {nominee.photo ? (
                                <img
                                  src={nominee.photo}
                                  alt={nominee.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-white/5 text-xs font-bold uppercase text-white/20">
                                  {nominee.name.charAt(0)}
                                </div>
                              )}
                            </div>

                            {/* Info + Progress Bar */}
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex min-w-0 items-center gap-1.5 truncate font-semibold text-white/80">
                                  {isLeader && (
                                    <FontAwesomeIcon
                                      icon={faCrown}
                                      className="flex-shrink-0 text-[0.75rem] text-dark-gold drop-shadow-[0_0_4px_rgba(212,175,55,0.4)]"
                                    />
                                  )}
                                  <span className="truncate">
                                    {nominee.name}
                                  </span>
                                </span>
                                <span className="ml-2 shrink-0 text-[0.75rem] font-medium tracking-wide text-white/40">
                                  <strong className="font-bold text-light-gold">
                                    {nominee.score}
                                  </strong>{" "}
                                  {nominee.score === 1 ? "voto" : "votos"} (
                                  {pct}%)
                                </span>
                              </div>

                              <div className="relative h-2 w-full overflow-hidden rounded-full border border-white/5 bg-black/40 shadow-inner">
                                <motion.div
                                  layout
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{
                                    duration: 0.6,
                                    ease: "easeOut",
                                  }}
                                  className={[
                                    "absolute left-0 top-0 h-full rounded-full",
                                    isLeader
                                      ? "bg-gradient-to-r from-dark-gold via-light-gold to-dark-gold shadow-[0_0_8px_rgba(212,175,55,0.2)]"
                                      : "bg-white/15",
                                  ].join(" ")}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-1 flex items-center justify-between border-t border-light-gold/10 pt-3 text-[0.65rem] text-white/20">
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon
                        icon={faCheckCircle}
                        className="text-green-500/50"
                      />
                      Total de {totalCatVotes}{" "}
                      {totalCatVotes === 1 ? "voto" : "votos"}
                    </span>
                    <span className="font-medium italic">
                      A atualizar em tempo real
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default VoteResults;
