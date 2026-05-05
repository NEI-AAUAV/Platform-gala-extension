import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelope,
  faIdCard,
  faCircleDot,
  faBus,
} from "@fortawesome/free-solid-svg-icons";
import { useUserStore } from "@/stores/useUserStore";
import useSessionUser, { State } from "@/hooks/userHooks/useSessionUser";
import useLoginLink from "@/hooks/useLoginLink";
import { useRegistrationConfig } from "@/hooks/useRegistrationConfig";
import { useHomepageConfig } from "@/hooks/useHomepageConfig";
import ProfilePaymentSection from "./ProfilePaymentSection";
import ProfileTableSection, {
  PendingInvitesBanner,
} from "./ProfileTableSection";
import useMyInvites from "@/hooks/tableHooks/useMyInvites";

type RegistrationStatus =
  | "pending_payment"
  | "partially_paid"
  | "confirmed"
  | "cancelled";

const STATUS_LABEL: Record<
  RegistrationStatus,
  { label: string; color: string }
> = {
  pending_payment: {
    label: "Aguarda pagamento",
    color: "text-yellow-400/80 border-yellow-400/30 bg-yellow-400/8",
  },
  partially_paid: {
    label: "Parcialmente pago",
    color: "text-sky-400/80 border-sky-400/30 bg-sky-400/8",
  },
  confirmed: {
    label: "Confirmada",
    color: "text-emerald-400/80 border-emerald-400/30 bg-emerald-400/8",
  },
  cancelled: {
    label: "Cancelada",
    color: "text-red-400/80 border-red-400/30 bg-red-400/8",
  },
};

type Tab = "registration" | "payment" | "table";

const TABS: { id: Tab; label: string }[] = [
  { id: "registration", label: "Inscrição" },
  { id: "payment", label: "Pagamento" },
  { id: "table", label: "Mesa" },
];

export default function Profile() {
  const { sessionLoading, token } = useUserStore();
  const { state, sessionUser, isLoading } = useSessionUser();
  const loginLink = useLoginLink();
  const { config } = useRegistrationConfig();
  const { config: homepage } = useHomepageConfig();
  const [activeTab, setActiveTab] = useState<Tab>("registration");

  if (!sessionLoading && !token) return <Navigate to={loginLink} />;

  // While SWR is loading session user from backend, show skeleton to avoid
  // flickering "not registered" for users who are actually registered.
  if (state === State.AUTHENTICATED && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-white/30">A carregar perfil...</p>
      </div>
    );
  }

  if (state === State.AUTHENTICATED) {
    return <NotRegisteredView />;
  }

  // Derive registration status and proof from backend data (source of truth)
  const registrationStatus: RegistrationStatus =
    sessionUser?.payment_expired || sessionUser?.registration_active === false
      ? "cancelled"
      : sessionUser?.has_payed
      ? "confirmed"
      : sessionUser?.phased_payment && sessionUser?.payment_phase1_confirmed
      ? "partially_paid"
      : "pending_payment";
  const proofName = sessionUser?.payment_proof_url ?? null;

  const { label, color } = STATUS_LABEL[registrationStatus];

  const containerWidth = activeTab === "table" ? "max-w-7xl" : "max-w-3xl";

  return (
    <div className="min-h-screen pb-24 pt-28">
      <div className={`mx-auto px-4 ${containerWidth}`}>
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col items-center gap-3 text-center"
        >
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-light-gold/40">
            Jantar de Gala — Perfil
          </span>
          <h1 className="font-gala text-3xl font-bold text-light-gold">
            O Meu Perfil
          </h1>
          <span
            className={`rounded-full border px-4 py-1 text-xs font-semibold ${color}`}
          >
            <FontAwesomeIcon
              icon={faCircleDot}
              className="mr-1.5 text-[0.6rem]"
            />
            {label}
          </span>
        </motion.div>

        {sessionUser?.is_companion_of ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex flex-col items-center gap-1 rounded-xl border border-purple-400/30 bg-purple-400/10 p-4 text-center text-sm text-purple-100/90"
          >
            <span className="font-semibold">Inscrito como Acompanhante</span>
            <span className="text-xs text-purple-100/70">
              Foste inscrito no jantar de gala como acompanhante. O teu
              pagamento e mesa são geridos pela pessoa que te convidou.
            </span>
          </motion.div>
        ) : (
          sessionUser?.admin_created && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex flex-col items-center gap-1 rounded-xl border border-blue-400/30 bg-blue-400/10 p-4 text-center text-sm text-blue-100/90"
            >
              <span className="font-semibold">Inscrição Automática</span>
              <span className="text-xs text-blue-100/70">
                A tua inscrição foi criada por um administrador. Podes consultar
                os detalhes e proceder com a tua mesa ou pagamento.
              </span>
            </motion.div>
          )
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="border-white/8 mb-8 flex items-center justify-center gap-2 border-b pb-4"
        >
          {TABS.filter(
            (t) => t.id !== "payment" || !sessionUser?.is_companion_of,
          ).map(({ id, label: tabLabel }) => (
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

        <div className="border-white/8 bg-white/3 rounded-2xl border p-6 sm:p-8">
          {activeTab === "registration" && (
            <RegistrationTab
              sessionUser={sessionUser}
              buses={homepage.bus_schedule.buses}
            />
          )}
          {activeTab === "payment" && (
            <ProfilePaymentSection
              config={config}
              proofName={proofName}
              onProofChange={() => {
                /* proof updates are now reflected via SWR revalidation */
              }}
            />
          )}
          {activeTab === "table" && <ProfileTableSection />}
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
    ? buses.find((b) => b.id === sessionUser.bus_assignment)?.name ??
      sessionUser.bus_assignment
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InfoRow
          icon={faUser}
          label="Nome"
          value={[name, surname].filter(Boolean).join(" ") || "—"}
        />
        <InfoRow icon={faEnvelope} label="Email" value={email || "—"} />
        <InfoRow
          icon={faIdCard}
          label="Nº Mecanográfico"
          value={String(sessionUser?.nmec || "—")}
        />
        <InfoRow
          icon={faIdCard}
          label="Ano"
          value={
            sessionUser?.matriculation
              ? `${sessionUser.matriculation}º Ano`
              : "Alumni / Outro"
          }
        />
        {sessionUser?.bus_option && sessionUser.bus_option !== "NONE" && (
          <InfoRow
            icon={faBus}
            label="Autocarro atribuído"
            value={busName ?? "Ainda não atribuído"}
          />
        )}
      </div>
      <div className="border-white/6 bg-white/3 rounded-xl border px-5 py-4">
        <p className="text-xs text-white/40">
          Para alterar os dados da inscrição (prato, autocarro, acompanhantes),
          contacta a organização por email.
        </p>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: Readonly<{ icon: typeof faUser; label: string; value: string }>) {
  return (
    <div className="border-white/6 bg-white/3 flex items-center gap-3 rounded-xl border px-4 py-3">
      <FontAwesomeIcon
        icon={icon}
        className="w-3 flex-shrink-0 text-light-gold/40"
      />
      <div>
        <p className="text-white/35 text-[0.6rem] uppercase tracking-widest">
          {label}
        </p>
        <p className="text-sm font-semibold text-white/75">{value}</p>
      </div>
    </div>
  );
}

function NotRegisteredView() {
  const { invites, mutate } = useMyInvites();

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 pt-28 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="font-gala text-2xl font-bold text-white/70">
          Ainda não te inscreveste
        </h1>
        <p className="text-sm text-white/40">
          Completa a inscrição para acederes ao teu perfil do Jantar de Gala.
        </p>
      </div>

      {invites.length > 0 && (
        <div className="w-full text-left">
          <PendingInvitesBanner
            invites={invites}
            onAccepted={() => {
              mutate();
            }}
          />
          <p className="mt-3 text-center text-[0.65rem] text-white/30">
            Precisas de te inscrever primeiro para poderes aceitar convites.
          </p>
        </div>
      )}

      <Link
        to="/register"
        className="border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black"
      >
        Inscrever-me
      </Link>
    </div>
  );
}
