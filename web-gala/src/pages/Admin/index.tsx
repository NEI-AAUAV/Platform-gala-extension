import { useState } from "react";
import classNames from "classnames";
import VoteResults from "@/components/VoteCard/VoteResults";
import VoteCategories from "./VoteCategories";
import TablesAdmin from "./TablesAdmin";

export default function Admin() {
  const [activeTab, setActiveTab] = useState<"tables" | "categories" | "results">(
    "categories",
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8">
      {/* ── Tabs Navbar ──────────────────────────────────────── */}
      <div className="flex w-full items-center justify-center gap-4 border-b border-dark-gold/20 pb-4">
        <button
          onClick={() => setActiveTab("tables")}
          className={classNames(
            "rounded-full px-6 py-2 font-gala text-lg font-semibold transition-all",
            activeTab === "tables"
              ? "bg-dark-gold text-black shadow-lg"
              : "text-dark-gold/60 hover:bg-dark-gold/10 hover:text-dark-gold",
          )}
        >
          Mesas (Lugares / Controle)
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={classNames(
            "rounded-full px-6 py-2 font-gala text-lg font-semibold transition-all",
            activeTab === "categories"
              ? "bg-dark-gold text-black shadow-lg"
              : "text-dark-gold/60 hover:bg-dark-gold/10 hover:text-dark-gold",
          )}
        >
          Categorias
        </button>
        <button
          onClick={() => setActiveTab("results")}
          className={classNames(
            "rounded-full px-6 py-2 font-gala text-lg font-semibold transition-all",
            activeTab === "results"
              ? "bg-dark-gold text-black shadow-lg"
              : "text-dark-gold/60 hover:bg-dark-gold/10 hover:text-dark-gold",
          )}
        >
          Resultados
        </button>
      </div>

      {/* ── Tab Content ──────────────────────────────────────── */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
      </div>
    </div>
  );
}
