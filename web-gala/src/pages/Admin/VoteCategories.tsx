import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faList,
  faChartBar,
} from "@fortawesome/free-solid-svg-icons";
import GalaService, { type AdminVoteCategory } from "@/services/GalaService";
import { useAppToast } from "@/components/ui/Toast";
import CreateCategoryForm from "./VoteCategories/components/CreateCategoryForm";
import CategoryRow from "./VoteCategories/components/CategoryRow";
import PhaseBanner from "./VoteCategories/components/PhaseBanner";
import VoteResults from "@/components/VoteCard/VoteResults";

export default function VoteCategories() {
  const [categories, setCategories] = useState<AdminVoteCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [togglingResults, setTogglingResults] = useState(false);
  const toast = useAppToast();

  const refresh = () => {
    if (categories.length === 0) {
      setLoading(true);
    }
    GalaService.admin
      .listVotingCategories()
      .then((data) => setCategories(data))
      .catch(() => toast.error("Erro ao carregar categorias."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    GalaService.config
      .getConfig()
      .then((cfg) =>
        setResultsVisible(
          (cfg as { results_visible?: boolean }).results_visible ?? false,
        ),
      )
      .catch(() => {
        setResultsVisible(false);
      });
  }, []);

  const handleResultsToggle = async () => {
    setTogglingResults(true);
    try {
      await GalaService.admin.setResultsVisibility(!resultsVisible);
      setResultsVisible((v) => !v);
      toast.success(
        resultsVisible
          ? "Resultados ocultados."
          : "Resultados visíveis para todos.",
      );
    } catch {
      toast.error("Erro ao alterar visibilidade dos resultados.");
    } finally {
      setTogglingResults(false);
    }
  };

  const resultsLabel = resultsVisible
    ? "Resultados visíveis"
    : "Resultados ocultos";

  const [activeSubTab, setActiveSubTab] = useState<"manage" | "results">(
    "manage",
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Sub-Tabs Control */}
      <div className="flex justify-center border-b border-light-gold/10 pb-4">
        <div className="inline-flex rounded-full border border-light-gold/20 bg-black/40 p-1 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveSubTab("manage")}
            className={[
              "flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-300",
              activeSubTab === "manage"
                ? "border border-dark-gold/30 bg-dark-gold/25 text-dark-gold shadow-md shadow-black/25"
                : "border border-transparent text-white/40 hover:text-white/80",
            ].join(" ")}
          >
            <FontAwesomeIcon icon={faList} className="text-[0.7rem]" />
            Gerir Categorias
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("results")}
            className={[
              "flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-300",
              activeSubTab === "results"
                ? "border border-dark-gold/30 bg-dark-gold/25 text-dark-gold shadow-md shadow-black/25"
                : "border border-transparent text-white/40 hover:text-white/80",
            ].join(" ")}
          >
            <FontAwesomeIcon icon={faChartBar} className="text-[0.7rem]" />
            Resultados
          </button>
        </div>
      </div>

      {activeSubTab === "manage" ? (
        <>
          <CreateCategoryForm onSuccess={refresh} />

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-dark-gold/20 pb-2">
              <h2 className="font-gala text-2xl font-semibold text-white/90">
                Categorias Existentes
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResultsToggle}
                  disabled={togglingResults}
                  className={[
                    "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
                    resultsVisible
                      ? "border-green-500/40 bg-green-500/10 text-green-400"
                      : "border-white/15 bg-white/5 text-white/40 hover:border-white/30 hover:text-white/70",
                  ].join(" ")}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      resultsVisible ? "bg-green-400" : "bg-white/20"
                    }`}
                  />
                  {togglingResults ? "..." : resultsLabel}
                </button>
                <PhaseBanner />
              </div>
            </div>
            {(() => {
              if (loading) {
                return (
                  <div className="flex items-center gap-3 p-4 text-white/50">
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="animate-spin text-dark-gold"
                    />
                    A carregar categorias...
                  </div>
                );
              }
              if (categories.length === 0) {
                return (
                  <p className="rounded-xl border border-white/5 bg-black/20 p-4 text-center text-sm text-white/40">
                    Ainda não há categorias criadas.
                  </p>
                );
              }
              return (
                <div className="grid gap-6">
                  {categories.map((vote) => (
                    <CategoryRow key={vote._id} vote={vote} refresh={refresh} />
                  ))}
                </div>
              );
            })()}
          </div>
        </>
      ) : (
        <div className="w-full">
          <VoteResults />
        </div>
      )}
    </div>
  );
}
