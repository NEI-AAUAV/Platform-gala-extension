import { useState } from "react";
import classNames from "classnames";
import VoteResults from "@/components/VoteCard/VoteResults";
import VoteCategories from "./VoteCategories";
import TablesAdmin from "./TablesAdmin";
import RegistrationAdmin from "./RegistrationAdmin";

type Tab = "registration" | "tables" | "categories" | "results";

const TABS: { id: Tab; label: string }[] = [
  { id: "registration", label: "Inscrições" },
  { id: "tables", label: "Mesas" },
  { id: "categories", label: "Categorias" },
  { id: "results", label: "Resultados" },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>("registration");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 pt-28">
      <div className="flex w-full flex-wrap items-center justify-center gap-2 border-b border-dark-gold/20 pb-4">
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
      </div>
    </div>
  );
}
