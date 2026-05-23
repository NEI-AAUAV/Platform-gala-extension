import { Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
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
import useCapacity from "@/hooks/useCapacity";
import Countdown from "@/components/Countdown";
import { useRegistrationConfig } from "@/hooks/useRegistrationConfig";
import { formatDatePT, formatTimePT } from "@/utils/formatDate";
import useVotes from "@/hooks/voteHooks/useVotes";

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

function LiveBadge({ label }: { readonly label: string }) {
  return (
    <span className="flex items-center gap-2 rounded-full border border-light-gold/20 bg-black/30 px-4 py-1.5 font-gala text-xs uppercase tracking-widest text-light-gold/70 backdrop-blur-sm">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-light-gold opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-light-gold" />
      </span>
      {label}
    </span>
  );
}

function SeatsBadge({ remaining }: { readonly remaining: number | undefined }) {
  if (remaining == null) return null;
  if (remaining <= 0)
    return (
      <span className="font-gala text-xs uppercase tracking-widest text-white/40">
        <span className="font-bold text-red-400">0</span> {"vagas disponíveis"}{" "}
        - <span className="text-red-400">inscrições encerradas</span>
      </span>
    );
  return (
    <span className="font-gala text-xs uppercase tracking-widest text-white/40">
      <span className="font-bold text-light-gold">{remaining}</span>{" "}
      {remaining === 1 ? "vaga disponível" : "vagas disponíveis"}
    </span>
  );
}

type CountdownEntry = { targetDate: string; label: string };

function nextCountdown(
  time: ReturnType<typeof useTime>["time"],
): CountdownEntry | null {
  if (!time) return null;

  return (
    [
      {
        active: time.nominationsStatus === TimeStatus.OPEN,
        targetDate: time.nominationsEnd,
        label: "Nomeações Terminam Em",
      },
      {
        active: time.votesStatus === TimeStatus.OPEN,
        targetDate: time.votesEnd,
        label: "Votação Termina Em",
      },
      {
        active: time.registrationStatus === TimeStatus.OPENING,
        targetDate: time.registrationStart,
        label: "Inscrição Abre Em",
      },
      {
        active: time.tablesStatus === TimeStatus.OPENING,
        targetDate: time.tablesStart,
        label: "Mesas Abrem Em",
      },
      {
        active: time.nominationsStatus === TimeStatus.OPENING,
        targetDate: time.nominationsStart,
        label: "Nomeações Abrem Em",
      },
      {
        active: time.galaStatus === TimeStatus.OPENING,
        targetDate: time.galaStart,
        label: "O Grande Dia Começa Em",
      },
      {
        active: time.votesStatus === TimeStatus.OPENING,
        targetDate: time.votesStart,
        label: "Votação Abre Em",
      },
    ]
      .flatMap((e) =>
        e.active && e.targetDate !== null
          ? [{ targetDate: e.targetDate, label: e.label }]
          : [],
      )
      .sort(
        (a, b) =>
          new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
      )
      .at(0) ?? null
  );
}

function RegisteredHeroContent({
  time,
  remainingSeats,
}: {
  readonly time: ReturnType<typeof useTime>["time"];
  readonly remainingSeats: number | undefined;
}) {
  const { votes } = useVotes();
  const hasRevealedCategories = useMemo(() => votes.some((v) => v.revealed), [votes]);

  const isRegistrationOpen = time?.registrationStatus === TimeStatus.OPEN;
  const isNominationsOpen = time?.nominationsStatus === TimeStatus.OPEN;
  const isVotingOpen = time?.votesStatus === TimeStatus.OPEN;
  const isTablesOpen = time?.tablesStatus === TimeStatus.OPEN;
  const isGalaOpen = time?.galaStatus === TimeStatus.OPEN;
  const countdown = nextCountdown(time);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="mt-12 flex flex-col items-center gap-8"
    >
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to="/profile"
          className="bg-light-gold px-10 py-4 font-gala text-sm font-bold text-black shadow-lg shadow-light-gold/20 transition-all hover:brightness-110 active:scale-95"
        >
          Ver Perfil
        </Link>
        {hasRevealedCategories && !isVotingOpen && (
          <Link
            to="/vote"
            className="border border-light-gold/60 px-10 py-4 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black active:scale-95"
          >
            Ver Nomeados
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
            to="/nominate"
            className="border border-white/20 px-10 py-4 font-gala text-sm font-semibold text-white/60 transition-all hover:border-white/40 hover:text-white active:scale-95"
          >
            Nomear
          </Link>
        )}
      </div>
      {isRegistrationOpen && <SeatsBadge remaining={remainingSeats} />}

      {(isNominationsOpen || isVotingOpen || isGalaOpen) && (
        <div className="flex flex-wrap justify-center gap-3">
          {isNominationsOpen && <LiveBadge label="Nomeações a Ocorrer" />}
          {isVotingOpen && <LiveBadge label="Votação a Ocorrer" />}
          {isGalaOpen && <LiveBadge label="Jantar a Ocorrer" />}
        </div>
      )}

      {countdown && (
        <Countdown targetDate={countdown.targetDate} label={countdown.label} />
      )}
    </motion.div>
  );
}

function HeroContent({
  state,
  loginLink,
  remainingSeats,
}: {
  readonly state: StateValue;
  readonly loginLink: string;
  readonly remainingSeats: number | undefined;
}) {
  const { time } = useTime();

  const isFull = remainingSeats !== undefined && remainingSeats <= 0;

  if (state === State.NONE) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-12 flex flex-col items-center justify-center gap-6"
      >
        <div className="flex flex-wrap justify-center gap-3">
          {isFull ? (
            <span className="cursor-not-allowed bg-light-gold/30 px-10 py-4 font-gala text-sm font-bold text-black/40">
              Inscrever no Jantar
            </span>
          ) : (
            <a
              href={loginLink}
              className="bg-light-gold px-10 py-4 font-gala text-sm font-bold text-black shadow-lg shadow-light-gold/20 transition-all hover:brightness-110 active:scale-95"
            >
              Inscrever no Jantar
            </a>
          )}
          <a
            href={loginLink}
            className="border border-white/20 px-10 py-4 font-gala text-sm font-semibold text-white/60 transition-all hover:border-white/40 hover:text-white"
          >
            Entrar
          </a>
        </div>
        <SeatsBadge remaining={remainingSeats} />
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
        {isFull ? (
          <span className="cursor-not-allowed bg-light-gold/30 px-10 py-4 font-gala text-sm font-bold text-black/40">
            Inscrever no Jantar
          </span>
        ) : (
          <Link
            to="/register"
            className="bg-light-gold px-10 py-4 font-gala text-sm font-bold text-black shadow-lg shadow-light-gold/20 transition-all hover:brightness-110 active:scale-95"
          >
            Inscrever no Jantar
          </Link>
        )}
        <SeatsBadge remaining={remainingSeats} />
        {time?.galaStatus === TimeStatus.OPENING && (
          <Countdown
            targetDate={time.galaStart}
            label="O Grande Dia Começa Em"
          />
        )}
      </motion.div>
    );
  }

  return <RegisteredHeroContent time={time} remainingSeats={remainingSeats} />;
}

export default function HeroSection() {
  const loginLink = useLoginLink();
  const { state, isLoading, mutate: galaUserRefetch } = useSessionUser();
  const { config } = useRegistrationConfig();
  const { time } = useTime();
  const { capacity } = useCapacity();

  useEffect(() => {
    if (!isLoading) galaUserRefetch();
  }, [isLoading, galaUserRefetch]);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-20 pt-20 md:pb-24">
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
          className="mt-8 flex flex-wrap items-center justify-center gap-4 rounded-full border border-light-gold/20 bg-black/30 px-6 py-3 backdrop-blur-sm"
        >
          <EventPill
            icon={faCalendarDay}
            text={time?.galaStart ? formatDatePT(time.galaStart) : "Em breve"}
          />
          <span className="bg-white/15 h-3 w-px" />
          <EventPill
            icon={faClock}
            text={formatTimePT(time?.galaStart ?? null)}
          />
          <span className="bg-white/15 h-3 w-px" />
          <EventPill icon={faLocationDot} text={config.eventLocation || "—"} />
        </motion.div>

        <HeroContent
          state={state}
          loginLink={loginLink}
          remainingSeats={capacity?.remaining}
        />
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 sm:block md:bottom-4"
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
