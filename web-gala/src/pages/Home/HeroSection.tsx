import { Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDay,
  faLocationDot,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import useLoginLink from "@/hooks/useLoginLink";
import useSessionUser, { State } from "@/hooks/userHooks/useSessionUser";
import useTime, { TimeStatus } from "@/hooks/timeHooks/useTime";
import Countdown from "@/components/Countdown";
import { useRegistrationConfig } from "@/hooks/useRegistrationConfig";
import homeBg from "@/assets/home-background.jpg";

function EventPill({
  icon,
  text,
}: {
  readonly icon: typeof faCalendarDay;
  readonly text: string;
}) {
  return (
    <span className="flex items-center gap-2 text-sm text-white/60">
      <FontAwesomeIcon icon={icon} className="text-xs text-light-gold/70" />
      {text}
    </span>
  );
}

type StateValue = (typeof State)[keyof typeof State];

function HeroContent({
  state,
  loginLink,
}: {
  readonly state: StateValue;
  readonly loginLink: string;
}) {
  const { time } = useTime();

  if (state === State.NONE) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-12 flex flex-col items-center justify-center gap-6"
      >
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={loginLink}
            className="bg-light-gold px-10 py-4 font-gala text-sm font-bold text-black shadow-lg shadow-light-gold/20 transition-all hover:brightness-110 active:scale-95"
          >
            Inscrever no Jantar
          </a>
          <a
            href={loginLink}
            className="border border-white/20 px-10 py-4 font-gala text-sm font-semibold text-white/60 transition-all hover:border-white/40 hover:text-white"
          >
            Entrar
          </a>
        </div>
        {time?.galaStatus === TimeStatus.OPENING && (
          <Countdown
            targetDate={time.galaStart}
            label="O Grande Dia Começa Em"
          />
        )}
      </motion.div>
    );
  }

  if (state === State.AUTHENTICATED) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-12 flex flex-col items-center gap-6"
      >
        <Link
          to="/register"
          className="bg-light-gold px-10 py-4 font-gala text-sm font-bold text-black shadow-lg shadow-light-gold/20 transition-all hover:brightness-110 active:scale-95"
        >
          Inscrever no Jantar
        </Link>
        {time?.galaStatus === TimeStatus.OPENING && (
          <Countdown
            targetDate={time.galaStart}
            label="O Grande Dia Começa Em"
          />
        )}
      </motion.div>
    );
  }

  const isRegistrationOpen = time?.registrationStatus === TimeStatus.OPEN;
  const isRegistrationOpening = time?.registrationStatus === TimeStatus.OPENING;
  const isNominationsOpen = time?.nominationsStatus === TimeStatus.OPEN;
  const isNominationsOpening = time?.nominationsStatus === TimeStatus.OPENING;
  const isVotingOpen = time?.votesStatus === TimeStatus.OPEN;
  const isVotingOpening = time?.votesStatus === TimeStatus.OPENING;
  const isTablesOpen = time?.tablesStatus === TimeStatus.OPEN;
  const isTablesOpening = time?.tablesStatus === TimeStatus.OPENING;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="mt-12 flex flex-col items-center gap-8"
    >
      {/* Primary CTAs */}
      <div className="flex flex-wrap justify-center gap-3">
        {isRegistrationOpen && (
          <Link
            to="/register"
            className="bg-light-gold px-10 py-4 font-gala text-sm font-bold text-black shadow-lg shadow-light-gold/20 transition-all hover:brightness-110 active:scale-95"
          >
            Inscrever no Jantar
          </Link>
        )}
        {isTablesOpen && (
          <Link
            to="/reserve"
            className="border border-light-gold/60 px-10 py-4 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black active:scale-95"
          >
            Escolher Mesa
          </Link>
        )}
        {isVotingOpen && (
          <Link
            to="/vote"
            className="bg-light-gold px-10 py-4 font-gala text-sm font-bold text-black shadow-lg shadow-light-gold/20 transition-all hover:brightness-110 active:scale-95"
          >
            Votar nos Prémios
          </Link>
        )}
        {isNominationsOpen && (
          <Link
            to="/vote"
            className="border border-white/20 px-10 py-4 font-gala text-sm font-semibold text-white/60 transition-all hover:border-white/40 hover:text-white active:scale-95"
          >
            Nomear
          </Link>
        )}
      </div>

      {/* Countdown chips */}
      {(isRegistrationOpening ||
        isTablesOpening ||
        isNominationsOpening ||
        isVotingOpening) && (
        <div className="flex flex-wrap justify-center gap-4">
          {isRegistrationOpening && (
            <Countdown
              targetDate={time!.registrationStart}
              label="Inscrição Abre Em"
            />
          )}
          {isTablesOpening && (
            <Countdown targetDate={time!.tablesStart} label="Mesas Abrem Em" />
          )}
          {isNominationsOpening && (
            <Countdown
              targetDate={time!.nominationsStart}
              label="Nomeações Abrem Em"
            />
          )}
          {isVotingOpening && (
            <Countdown targetDate={time!.votesStart} label="Votação Abre Em" />
          )}
        </div>
      )}

      {time?.galaStatus === TimeStatus.OPENING && (
        <Countdown targetDate={time.galaStart} label="O Grande Dia Começa Em" />
      )}
    </motion.div>
  );
}

export default function HeroSection() {
  const loginLink = useLoginLink();
  const { state, isLoading, mutate: galaUserRefetch } = useSessionUser();
  const { config } = useRegistrationConfig();

  useEffect(() => {
    if (!isLoading) galaUserRefetch();
  }, [isLoading, galaUserRefetch]);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-20">
      {/* Background image */}
      <div className="absolute inset-0 -z-10">
        <img
          src={homeBg}
          alt=""
          className="h-full w-full object-cover object-center"
          aria-hidden="true"
        />
        {/* Multi-layer overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        <div className="absolute inset-0 bg-[#050505]/40" />
      </div>

      {/* Subtle vignette */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, rgba(5,5,5,0.7) 100%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="flex flex-col items-center text-center"
      >
        {/* Eyebrow */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 font-gala text-[0.7rem] uppercase tracking-[0.4em] text-light-gold/60"
        >
          Núcleo de Estudantes de Informática
        </motion.span>

        {/* Title */}
        <h1
          className="font-gala font-bold leading-none text-light-gold drop-shadow-2xl"
          style={{ fontSize: "clamp(3.5rem, 10vw, 8rem)" }}
        >
          Jantar
          <br />
          de Gala
        </h1>

        {/* Event pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4 rounded-full border border-white/10 bg-black/30 px-6 py-3 backdrop-blur-sm"
        >
          <EventPill
            icon={faCalendarDay}
            text={config.eventDate || "Em breve"}
          />
          <span className="bg-white/15 h-3 w-px" />
          <EventPill icon={faClock} text={config.eventTime || "—"} />
          <span className="bg-white/15 h-3 w-px" />
          <EventPill icon={faLocationDot} text={config.eventLocation || "—"} />
        </motion.div>

        <HeroContent state={state} loginLink={loginLink} />
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="font-gala text-[0.55rem] uppercase tracking-[0.3em] text-white/25">
            Explorar
          </span>
          <div className="h-8 w-px bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </motion.div>
    </section>
  );
}
