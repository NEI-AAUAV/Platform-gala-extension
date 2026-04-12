import { Link } from "react-router-dom";
import useSessionUser, { State } from "@/hooks/userHooks/useSessionUser";
import useLoginLink from "@/hooks/useLoginLink";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDay, faLocationDot, faClock } from "@fortawesome/free-solid-svg-icons";
import useTime, { TimeStatus } from "@/hooks/timeHooks/useTime";
import Countdown from "@/components/Countdown";
import { useRegistrationConfig } from "@/hooks/useRegistrationConfig";

function EventPill({ icon, text }: { readonly icon: typeof faCalendarDay; readonly text: string }) {
  return (
    <span className="flex items-center gap-2 text-sm text-white/50">
      <FontAwesomeIcon icon={icon} className="text-xs text-light-gold/60" />
      {text}
    </span>
  );
}

type StateValue = (typeof State)[keyof typeof State];

function HeroContent({ state, loginLink }: { readonly state: StateValue; readonly loginLink: string }) {
  const { time } = useTime();

  if (state === State.NONE) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mt-10 flex flex-col items-center justify-center gap-6"
      >
        <a
          href={loginLink}
          className="border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black"
        >
          Entrar e Inscrever
        </a>
        {time?.galaStatus === TimeStatus.OPENING && (
          <Countdown targetDate={time.galaStart} label="O Grande Dia Começa Em" />
        )}
      </motion.div>
    );
  }

  if (state === State.AUTHENTICATED) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mt-10 flex flex-col items-center gap-6"
      >
        <Link
          to="/register"
          className="border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black"
        >
          Inscrever no Jantar
        </Link>
        {time?.galaStatus === TimeStatus.OPENING && (
          <Countdown targetDate={time.galaStart} label="O Grande Dia Começa Em" />
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
      transition={{ delay: 0.4, duration: 0.5 }}
      className="mt-10 flex flex-col items-center gap-10"
    >
      <div className="flex flex-wrap justify-center gap-4">
        {isRegistrationOpen && (
          <Link
            to="/register"
            className="border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black"
          >
            Inscrever no Jantar
          </Link>
        )}
        {isRegistrationOpening && (
          <Countdown targetDate={time.registrationStart} label="Inscrição Abre Em" />
        )}
        {isTablesOpen && (
          <Link
            to="/reserve"
            className="border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black"
          >
            Escolher Mesa
          </Link>
        )}
        {isTablesOpening && (
          <Countdown targetDate={time.tablesStart} label="Mesas Abrem Em" />
        )}
        {isNominationsOpen && (
          <Link
            to="/vote"
            className="border border-white/20 px-8 py-3 font-gala text-sm font-semibold text-white/60 transition-all hover:border-white/40 hover:text-white"
          >
            Dizer Nomeados
          </Link>
        )}
        {isNominationsOpening && (
          <Countdown targetDate={time.nominationsStart} label="Nomeações Abrem Em" />
        )}
        {isVotingOpen && (
          <Link
            to="/vote"
            className="bg-light-gold px-8 py-3 font-gala text-sm font-bold text-black transition-all hover:bg-white"
          >
            Votar nos Prémios
          </Link>
        )}
        {isVotingOpening && (
          <Countdown targetDate={time.votesStart} label="Votação Abre Em" />
        )}
      </div>

      {time?.galaStatus === TimeStatus.OPENING && (
        <Countdown targetDate={time.galaStart} label="O Grande Dia Começa Em" className="mt-4" />
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
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="flex flex-col items-center text-center"
      >
        <span className="mb-6 font-gala text-[0.7rem] uppercase tracking-[0.4em] text-light-gold/50">
          ENGENHARIA INFORMÁTICA
        </span>

        <h1 className="font-gala text-[4rem] font-bold leading-none text-light-gold drop-shadow-lg sm:text-[6rem] lg:text-[7.5rem]">
          Jantar
          <br />
          de Gala
        </h1>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
          <EventPill icon={faCalendarDay} text={config.eventDate} />
          <span className="h-3 w-px bg-white/20" />
          <EventPill icon={faClock} text={config.eventTime} />
          <span className="h-3 w-px bg-white/20" />
          <EventPill icon={faLocationDot} text={config.eventLocation} />
        </div>

        <HeroContent state={state} loginLink={loginLink} />
      </motion.div>
    </section>
  );
}
