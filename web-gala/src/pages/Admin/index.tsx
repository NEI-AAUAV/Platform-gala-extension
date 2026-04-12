import { useState, useRef, useCallback, useEffect } from "react";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import VoteResults from "@/components/VoteCard/VoteResults";
import VoteCategories from "./VoteCategories";
import TablesAdmin from "./TablesAdmin";
import RegistrationAdmin from "./RegistrationAdmin";
import HomepageAdmin from "./HomepageAdmin";
import BusAssignmentAdmin from "./BusAssignmentAdmin";
import { useConfigStore } from "@/stores/useConfigStore";

type Tab = "registration" | "tables" | "categories" | "results" | "homepage" | "buses";

const TABS: { id: Tab; label: string }[] = [
  { id: "registration", label: "Inscrições" },
  { id: "tables", label: "Mesas" },
  { id: "categories", label: "Categorias" },
  { id: "results", label: "Resultados" },
  { id: "homepage", label: "Homepage" },
  { id: "buses", label: "Autocarros" },
];

const PREVIEW_ROUTES: Partial<Record<Tab, string>> = {
  registration: "/register",
  homepage: "/",
  categories: "/vote",
  results: "/vote",
  tables: "/reserve",
};

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>("registration");
  const [previewOpen, setPreviewOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { raw } = useConfigStore();

  const previewRoute = PREVIEW_ROUTES[activeTab] ?? "/";

  const reload = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }, []);

  // Auto-reload preview 1.5s after config changes (debounced)
  useEffect(() => {
    if (!previewOpen) return;
    const timer = setTimeout(reload, 1500);
    return () => clearTimeout(timer);
  }, [raw, previewOpen, reload]);

  const hasPreview = activeTab in PREVIEW_ROUTES;

  return (
    <div className="min-h-screen pt-20">
      <div
        className={classNames(
          "flex h-[calc(100vh-5rem)] transition-all duration-500",
          previewOpen ? "gap-0" : "",
        )}
      >
        {/* ── Admin panel ── */}
        <div
          className={classNames(
            "flex flex-col overflow-y-auto transition-all duration-500",
            previewOpen ? "w-1/2 border-r border-white/8" : "w-full",
          )}
        >
          <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
            {/* Tabs + preview toggle */}
            <div className="mb-8 flex w-full flex-wrap items-center justify-between gap-3 border-b border-dark-gold/20 pb-4">
              <div className="flex flex-wrap gap-2">
                {TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={classNames(
                      "rounded-full px-5 py-2 font-gala text-sm font-semibold transition-all",
                      activeTab === id
                        ? "bg-dark-gold text-black shadow-lg"
                        : "text-dark-gold/60 hover:bg-dark-gold/10 hover:text-dark-gold",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {hasPreview && (
                <button
                  onClick={() => setPreviewOpen((o) => !o)}
                  className={classNames(
                    "flex items-center gap-2 rounded-full border px-4 py-2 font-gala text-xs font-semibold transition-all",
                    previewOpen
                      ? "border-light-gold/50 bg-light-gold/10 text-light-gold"
                      : "border-white/15 text-white/40 hover:border-white/30 hover:text-white/70",
                  )}
                >
                  <FontAwesomeIcon icon={previewOpen ? faEyeSlash : faEye} className="text-[0.7rem]" />
                  {previewOpen ? "Fechar preview" : "Ver preview"}
                </button>
              )}
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeTab === "registration" && (
                <section>
                  <h1 className="mb-6 font-gala text-3xl font-bold text-dark-gold">
                    Configuração das Inscrições
                  </h1>
                  <RegistrationAdmin />
                </section>
              )}
              {activeTab === "tables" && (
                <section>
                  <h1 className="mb-6 font-gala text-3xl font-bold text-dark-gold">
                    Gestão de Mesas e Reservas
                  </h1>
                  <TablesAdmin />
                </section>
              )}
              {activeTab === "categories" && (
                <section className="mx-auto max-w-3xl">
                  <h1 className="mb-6 font-gala text-3xl font-bold text-dark-gold">
                    Gestão de Categorias
                  </h1>
                  <VoteCategories />
                </section>
              )}
              {activeTab === "results" && (
                <section className="mx-auto max-w-3xl">
                  <h1 className="mb-6 font-gala text-3xl font-bold text-dark-gold">
                    Resultados de Votação
                  </h1>
                  <VoteResults />
                </section>
              )}
              {activeTab === "homepage" && (
                <section className="mx-auto max-w-3xl">
                  <h1 className="mb-6 font-gala text-3xl font-bold text-dark-gold">
                    Conteúdo da Homepage
                  </h1>
                  <HomepageAdmin />
                </section>
              )}
              {activeTab === "buses" && (
                <section>
                  <h1 className="mb-6 font-gala text-3xl font-bold text-dark-gold">
                    Distribuição de Autocarros
                  </h1>
                  <BusAssignmentAdmin />
                </section>
              )}
            </div>
          </div>
        </div>

        {/* ── Live preview ── */}
        {previewOpen && (
          <div className="flex w-1/2 flex-col bg-black">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-2">
              <span className="font-gala text-xs font-semibold uppercase tracking-widest text-white/30">
                Preview — {previewRoute}
              </span>
              <button
                onClick={reload}
                title="Recarregar preview"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/8 hover:text-white/60"
              >
                <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
              </button>
            </div>
            <iframe
              key={activeTab}
              ref={iframeRef}
              src={previewRoute}
              className="flex-1 w-full border-0"
              title="Preview"
            />
          </div>
        )}
      </div>
    </div>
  );
}
