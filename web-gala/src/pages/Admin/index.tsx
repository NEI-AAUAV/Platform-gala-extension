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
import PermissoesAdmin from "./PermissoesAdmin";
import { useConfigStore } from "@/stores/useConfigStore";
import { useManagerPermissions } from "@/hooks/useManagerPermissions";
import { ManagerPermissionKey } from "@/services/GalaService";

type Tab = "registration" | "tables" | "categories" | "results" | "homepage" | "buses" | "permissoes";

type TabDefinition = {
  id: Tab;
  label: string;
  permission?: ManagerPermissionKey;
  adminOnly?: boolean;
};

const ALL_TABS: TabDefinition[] = [
  { id: "registration", label: "Inscrições", permission: "registration" },
  { id: "tables", label: "Mesas", permission: "tables" },
  { id: "categories", label: "Categorias", permission: "categories" },
  { id: "results", label: "Resultados", permission: "categories" },
  { id: "homepage", label: "Homepage", permission: "homepage" },
  { id: "buses", label: "Autocarros", permission: "buses" },
  { id: "permissoes", label: "Permissões", adminOnly: true },
];

const PREVIEW_ROUTES: Partial<Record<Tab, string>> = {
  registration: "/register",
  homepage: "/",
  categories: "/vote",
  results: "/vote",
  tables: "/reserve",
};

export default function Admin() {
  const { isAdmin, permissions, loading, error } = useManagerPermissions();
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { raw } = useConfigStore();

  const visibleTabs = ALL_TABS.filter((tab) => {
    if (tab.adminOnly) return isAdmin;
    if (isAdmin) return true;
    return tab.permission ? permissions.has(tab.permission) : false;
  });

  useEffect(() => {
    if (loading || activeTab) return;
    if (visibleTabs.length > 0) setActiveTab(visibleTabs[0].id);
  }, [loading, visibleTabs, activeTab]);

  const previewRoute = activeTab ? (PREVIEW_ROUTES[activeTab] ?? "/") : "/";

  const reload = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.location.reload();
    }
  }, []);

  useEffect(() => {
    if (!previewOpen) return;
    const timer = setTimeout(reload, 1500);
    return () => clearTimeout(timer);
  }, [raw, previewOpen, reload]);

  const hasPreview = activeTab !== null && activeTab in PREVIEW_ROUTES;

  if (loading) {
    return <div className="min-h-screen pt-20 flex items-center justify-center text-white/30 text-sm">A carregar...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-red-400/60 text-sm">Erro ao carregar permissões. Tenta recarregar a página.</p>
      </div>
    );
  }

  if (visibleTabs.length === 0) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-white/40 text-sm">Sem permissões de acesso ao painel de administração.</p>
      </div>
    );
  }

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
                {visibleTabs.map(({ id, label }) => (
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
              {activeTab === "permissoes" && (
                <section className="mx-auto max-w-3xl">
                  <h1 className="mb-6 font-gala text-3xl font-bold text-dark-gold">
                    Permissões de Managers
                  </h1>
                  <PermissoesAdmin />
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
