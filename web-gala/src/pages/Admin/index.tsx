import { useState, useRef, useCallback, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faEyeSlash,
  faRotateRight,
  faClipboardList,
  faChair,
  faTrophy,
  faChartBar,
  faHouse,
  faShieldHalved,
  faBars,
  faXmark,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import VoteResults from "@/components/VoteCard/VoteResults";
import VoteCategories from "./VoteCategories";
import TablesAdmin from "./TablesAdmin";
import RegistrationAdmin from "./RegistrationAdmin";
import HomepageAdmin from "./HomepageAdmin";
import PermissoesAdmin from "./PermissoesAdmin";
import RegistrantsAdmin from "./RegistrantsAdmin";
import BusAssignmentAdmin from "./BusAssignmentAdmin";
import { useConfigStore } from "@/stores/useConfigStore";
import { useManagerPermissions } from "@/hooks/useManagerPermissions";
import { ManagerPermissionKey } from "@/services/GalaService";

type Tab =
  | "registration"
  | "inscritos"
  | "tables"
  | "categories"
  | "results"
  | "homepage"
  | "permissoes";

type TabDefinition = {
  id: Tab;
  label: string;
  icon: typeof faClipboardList;
  description: string;
  permission?: ManagerPermissionKey;
  adminOnly?: boolean;
};

const ALL_TABS: TabDefinition[] = [
  {
    id: "registration",
    label: "Configurações",
    icon: faClipboardList,
    description: "Datas, preços, refeições e limites",
    permission: "registration",
  },
  {
    id: "inscritos",
    label: "Inscritos",
    icon: faUsers,
    description: "Gestão de inscritos, mesas e autocarros",
    permission: "registration",
  },
  {
    id: "tables",
    label: "Mesas",
    icon: faChair,
    description: "Período, limites e visão geral de mesas",
    permission: "tables",
  },
  {
    id: "categories",
    label: "Categorias",
    icon: faTrophy,
    description: "Gerir categorias de votação",
    permission: "categories",
  },
  {
    id: "results",
    label: "Resultados",
    icon: faChartBar,
    description: "Resultados e contagens de votos",
    permission: "categories",
  },
  {
    id: "homepage",
    label: "Homepage",
    icon: faHouse,
    description: "Conteúdo visível na página inicial",
    permission: "homepage",
  },
  {
    id: "permissoes",
    label: "Permissões",
    icon: faShieldHalved,
    description: "Gerir managers e acessos",
    adminOnly: true,
  },
];

const PREVIEW_ROUTES: Partial<Record<Tab, string>> = {
  registration: "/register",
  homepage: "/",
  categories: "/vote",
  results: "/vote",
  tables: "/reserve",
};

const SECTION_TITLES: Record<Tab, { title: string; sub: string }> = {
  registration: {
    title: "Configurações do Jantar",
    sub: "Datas, preços, refeições, pagamento e limites.",
  },
  inscritos: {
    title: "Gestão de Inscritos",
    sub: "Estatísticas, inscritos, confirmação de pagamentos, mesas e autocarros.",
  },
  tables: {
    title: "Mesas e Reservas",
    sub: "Período de escolha, limites e visão geral das mesas criadas.",
  },
  categories: {
    title: "Categorias de Votação",
    sub: "Gerir as categorias disponíveis para votação.",
  },
  results: {
    title: "Resultados de Votação",
    sub: "Ver contagens e aprovar a publicação de resultados.",
  },
  homepage: {
    title: "Conteúdo da Homepage",
    sub: "Controla o que aparece na página inicial do evento.",
  },
  permissoes: {
    title: "Permissões de Managers",
    sub: "Controla quem tem acesso ao painel de administração e a que secções.",
  },
};

export default function Admin() {
  const prefersReducedMotion = useReducedMotion();
  const { isAdmin, permissions, loading, error } = useManagerPermissions();
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const previewRoute = activeTab ? PREVIEW_ROUTES[activeTab] ?? "/" : "/";

  const reload = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.location.reload();
    }
  }, []);

  useEffect(() => {
    if (!previewOpen) return undefined;
    const timer = setTimeout(reload, 1500);
    return () => clearTimeout(timer);
  }, [raw, previewOpen, reload]);

  // Close mobile sidebar on tab change
  const handleTabChange = (id: Tab) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const hasPreview = activeTab !== null && activeTab in PREVIEW_ROUTES;
  const sectionMeta = activeTab ? SECTION_TITLES[activeTab] : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20 text-sm text-white/30">
        A carregar...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20">
        <p className="text-sm text-red-400/60">
          Erro ao carregar permissões. Tenta recarregar a página.
        </p>
      </div>
    );
  }

  if (visibleTabs.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20">
        <p className="text-sm text-white/40">
          Sem permissões de acesso ao painel de administração.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="flex h-[calc(100vh-5rem)]">
        {/* ── Mobile sidebar backdrop ── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* ── Sidebar ── */}
        {/* Desktop: always visible. Mobile: slide-in drawer */}
        <aside
          className={[
            // Mobile: fixed full-height drawer
            "border-white/8 fixed left-0 top-20 z-50 h-[calc(100vh-5rem)] w-64 flex-col border-r bg-[#0a0a0a] transition-transform duration-300 lg:relative lg:top-0 lg:z-auto lg:flex lg:translate-x-0",
            sidebarOpen
              ? "flex translate-x-0"
              : "hidden -translate-x-full lg:flex",
          ].join(" ")}
        >
          {/* Sidebar header */}
          <div className="border-white/8 flex items-center justify-between border-b px-5 py-4">
            <span className="font-gala text-[0.6rem] font-bold uppercase tracking-[0.3em] text-white/30">
              Admin
            </span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="hover:bg-white/8 flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition hover:text-white/60 lg:hidden"
            >
              <FontAwesomeIcon icon={faXmark} className="text-xs" />
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
            {visibleTabs.map(({ id, label, icon, description }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleTabChange(id)}
                  className={[
                    "group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-all",
                    isActive
                      ? "bg-dark-gold/12 text-dark-gold"
                      : "text-white/50 hover:bg-white/5 hover:text-white/80",
                  ].join(" ")}
                >
                  <FontAwesomeIcon
                    icon={icon}
                    className={[
                      "mt-0.5 w-4 shrink-0 text-sm transition-colors",
                      isActive
                        ? "text-dark-gold"
                        : "text-white/25 group-hover:text-white/50",
                    ].join(" ")}
                  />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-gala text-sm font-semibold leading-tight">
                      {label}
                    </span>
                    <span
                      className={[
                        "text-[0.6rem] leading-snug",
                        isActive ? "text-dark-gold/60" : "text-white/25",
                      ].join(" ")}
                    >
                      {description}
                    </span>
                  </div>
                  {isActive && (
                    <div className="ml-auto h-4 w-0.5 shrink-0 self-center rounded-full bg-dark-gold" />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Main content area ── */}
        <div className="flex flex-1 flex-col overflow-hidden transition-all duration-500">
          {/* Top bar (mobile hamburger + preview toggle) */}
          <div className="border-white/8 flex shrink-0 items-center justify-between border-b px-4 py-3 lg:px-6">
            {/* Mobile: hamburger */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2.5 font-gala text-sm font-semibold text-white/60 transition hover:text-white/90 lg:hidden"
            >
              <FontAwesomeIcon icon={faBars} className="text-sm" />
              {sectionMeta?.title ?? "Menu"}
            </button>

            {/* Desktop: section title */}
            <div className="hidden lg:block">
              {sectionMeta && (
                <div>
                  <h1 className="font-gala text-lg font-bold leading-tight text-dark-gold">
                    {sectionMeta.title}
                  </h1>
                  <p className="text-white/35 mt-0.5 text-xs">
                    {sectionMeta.sub}
                  </p>
                </div>
              )}
            </div>

            {/* Preview toggle */}
            {hasPreview && (
              <button
                type="button"
                onClick={() => setPreviewOpen((o) => !o)}
                className={[
                  "flex items-center gap-2 rounded-full border px-4 py-1.5 font-gala text-xs font-semibold transition-all",
                  previewOpen
                    ? "border-light-gold/50 bg-light-gold/10 text-light-gold"
                    : "border-white/15 text-white/40 hover:border-white/30 hover:text-white/70",
                ].join(" ")}
              >
                <FontAwesomeIcon
                  icon={previewOpen ? faEyeSlash : faEye}
                  className="text-[0.7rem]"
                />
                {previewOpen ? "Fechar preview" : "Ver preview"}
              </button>
            )}
          </div>

          {/* Content + optional preview */}
          <div className="flex flex-1 overflow-hidden">
            {/* Scrollable content */}
            <div
              className={[
                "flex-1 overflow-y-auto transition-all duration-500",
                previewOpen ? "hidden md:block md:w-1/2" : "w-full",
              ].join(" ")}
            >
              <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
                {/* Mobile section title */}
                {sectionMeta && (
                  <div className="mb-6 lg:hidden">
                    <h1 className="font-gala text-xl font-bold text-dark-gold">
                      {sectionMeta.title}
                    </h1>
                    <p className="text-white/35 mt-1 text-xs">
                      {sectionMeta.sub}
                    </p>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab ?? "empty"}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
                  >
                    {activeTab === "registration" && <RegistrationAdmin />}
                    {activeTab === "inscritos" && (
                      <div className="flex flex-col gap-10">
                        <RegistrantsAdmin />
                        <BusAssignmentAdmin />
                      </div>
                    )}
                    {activeTab === "tables" && <TablesAdmin />}
                    {activeTab === "categories" && (
                      <div className="mx-auto max-w-3xl">
                        <VoteCategories />
                      </div>
                    )}
                    {activeTab === "results" && (
                      <div className="mx-auto max-w-3xl">
                        <VoteResults />
                      </div>
                    )}
                    {activeTab === "homepage" && (
                      <div className="mx-auto max-w-3xl">
                        <HomepageAdmin />
                      </div>
                    )}
                    {activeTab === "permissoes" && (
                      <div className="mx-auto max-w-3xl">
                        <PermissoesAdmin />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Live preview pane */}
            {previewOpen && (
              <div className="md:border-white/8 flex w-full flex-col bg-black md:w-1/2 md:border-l">
                <div className="border-white/8 flex shrink-0 items-center justify-between border-b px-4 py-2">
                  <span className="font-gala text-xs font-semibold uppercase tracking-widest text-white/30">
                    Preview — {previewRoute}
                  </span>
                  <button
                    type="button"
                    onClick={reload}
                    title="Recarregar preview"
                    className="hover:bg-white/8 flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition hover:text-white/60"
                  >
                    <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
                  </button>
                </div>
                <iframe
                  key={activeTab}
                  ref={iframeRef}
                  src={previewRoute}
                  className="w-full flex-1 border-0"
                  title="Preview"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
