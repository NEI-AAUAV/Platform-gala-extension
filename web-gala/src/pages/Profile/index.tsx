import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faEnvelope, faIdCard, faCircleDot, faBus } from "@fortawesome/free-solid-svg-icons";
import { useUserStore } from "@/stores/useUserStore";
import useSessionUser, { State } from "@/hooks/userHooks/useSessionUser";
import useLoginLink from "@/hooks/useLoginLink";
import { useRegistrationConfig } from "@/hooks/useRegistrationConfig";
import { useHomepageConfig } from "@/hooks/useHomepageConfig";
import ProfilePaymentSection from "./ProfilePaymentSection";
import ProfileTableSection from "./ProfileTableSection";

type RegistrationStatus = "pending_payment" | "confirmed" | "cancelled";

const STATUS_LABEL: Record<RegistrationStatus, { label: string; color: string }> = {
  pending_payment: { label: "Aguarda pagamento", color: "text-yellow-400/80 border-yellow-400/30 bg-yellow-400/8" },
  confirmed: { label: "Confirmada", color: "text-emerald-400/80 border-emerald-400/30 bg-emerald-400/8" },
  cancelled: { label: "Cancelada", color: "text-red-400/80 border-red-400/30 bg-red-400/8" },
};

const PROFILE_KEY = "gala-profile-state";

function loadStatus(): RegistrationStatus {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (!stored) return "pending_payment";
    return JSON.parse(stored).status ?? "pending_payment";
  } catch {
    return "pending_payment";
  }
}

function loadProof(): string | null {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (!stored) return null;
    return JSON.parse(stored).proofName ?? null;
  } catch {
    return null;
  }
}

function saveProfile(status: RegistrationStatus, proofName: string | null) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ status, proofName }));
}

type Tab = "registration" | "payment" | "table";

const TABS: { id: Tab; label: string }[] = [
  { id: "registration", label: "Inscrição" },
  { id: "payment", label: "Pagamento" },
  { id: "table", label: "Mesa" },
];

export default function Profile() {
  const { sessionLoading, token } = useUserStore();
  const { state, sessionUser } = useSessionUser();
  const loginLink = useLoginLink();
  const { config } = useRegistrationConfig();
  const { config: homepage } = useHomepageConfig();
  const [activeTab, setActiveTab] = useState<Tab>("registration");
  const [status] = useState<RegistrationStatus>(loadStatus);
  const [proofName, setProofName] = useState<string | null>(loadProof);

  if (!sessionLoading && !token) return <Navigate to={loginLink} />;

  const handleProofChange = (name: string) => {
    setProofName(name);
    saveProfile(status, name);
  };

  if (state === State.AUTHENTICATED) {
    return <NotRegisteredView />;
  }

  const { label, color } = STATUS_LABEL[status];

  return (
    <div className="min-h-screen pb-24 pt-28">
      <div className="mx-auto max-w-4xl px-4">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col items-center gap-3 text-center"
        >
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-light-gold/40">
            Jantar de Gala — Perfil
          </span>
          <h1 className="font-gala text-3xl font-bold text-light-gold">O Meu Perfil</h1>
          <span className={`rounded-full border px-4 py-1 text-xs font-semibold ${color}`}>
            <FontAwesomeIcon icon={faCircleDot} className="mr-1.5 text-[0.6rem]" />
            {label}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex items-center justify-center gap-2 border-b border-white/8 pb-4"
        >
          {TABS.map(({ id, label: tabLabel }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={[
                "rounded-full px-5 py-2 font-gala text-sm font-semibold transition-all",
                activeTab === id
                  ? "bg-light-gold/15 text-light-gold"
                  : "text-white/40 hover:text-white/70",
              ].join(" ")}
            >
              {tabLabel}
            </button>
          ))}
        </motion.div>

        <div className="rounded-2xl border border-white/8 bg-white/3 p-6 sm:p-8">
          {activeTab === "registration" && (
            <RegistrationTab sessionUser={sessionUser} buses={homepage.bus_schedule.buses} />
          )}
          {activeTab === "payment" && (
            <ProfilePaymentSection
              config={config}
              proofName={proofName}
              onProofChange={handleProofChange}
            />
          )}
          {activeTab === "table" && <ProfileTableSection config={config} />}
        </div>
      </div>
    </div>
  );
}

function RegistrationTab({
  sessionUser,
  buses,
}: Readonly<{
  sessionUser: ReturnType<typeof useSessionUser>["sessionUser"];
  buses: import("@/hooks/useHomepageConfig").BusVehicle[];
}>) {
  const { name, surname, email } = useUserStore();

  const busName = sessionUser?.bus_assignment
    ? (buses.find((b) => b.id === sessionUser.bus_assignment)?.name ?? sessionUser.bus_assignment)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InfoRow icon={faUser} label="Nome" value={[name, surname].filter(Boolean).join(" ") || "—"} />
        <InfoRow icon={faEnvelope} label="Email" value={email || "—"} />
        <InfoRow icon={faIdCard} label="Nº Mecanográfico" value={String(sessionUser?.nmec || "—")} />
        <InfoRow
          icon={faIdCard}
          label="Ano"
          value={sessionUser?.matriculation ? `${sessionUser.matriculation}º Ano` : "Alumni / Outro"}
        />
        {sessionUser?.bus_option && sessionUser.bus_option !== "NONE" && (
          <InfoRow
            icon={faBus}
            label="Autocarro atribuído"
            value={busName ?? "Ainda não atribuído"}
          />
        )}
      </div>
      <div className="rounded-xl border border-white/6 bg-white/3 px-5 py-4">
        <p className="text-xs text-white/40">
          Para alterar os dados da inscrição (prato, autocarro, acompanhantes), contacta a organização
          por email.
        </p>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: Readonly<{ icon: typeof faUser; label: string; value: string }>) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/3 px-4 py-3">
      <FontAwesomeIcon icon={icon} className="w-3 flex-shrink-0 text-light-gold/40" />
      <div>
        <p className="text-[0.6rem] uppercase tracking-widest text-white/35">{label}</p>
        <p className="text-sm font-semibold text-white/75">{value}</p>
      </div>
    </div>
  );
}

function NotRegisteredView() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 pt-28 text-center">
      <h1 className="font-gala text-2xl font-bold text-white/70">Ainda não te inscreveste</h1>
      <p className="max-w-sm text-sm text-white/40">
        Completa a inscrição para acederes ao teu perfil do Jantar de Gala.
      </p>
      <Link
        to="/register"
        className="border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black"
      >
        Inscrever-me
      </Link>
    </div>
  );
}
