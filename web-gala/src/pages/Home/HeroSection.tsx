import { useNavigate, Link } from "react-router-dom";
import useSessionUser, { State } from "@/hooks/userHooks/useSessionUser";
import useLoginLink from "@/hooks/useLoginLink";
import Input from "@/components/Input";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import GalaService from "@/services/GalaService";
import { motion } from "framer-motion";
import { galaContent } from "@/config/galaContent";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDay, faLocationDot, faClock } from "@fortawesome/free-solid-svg-icons";
import useTime, { TimeStatus } from "@/hooks/timeHooks/useTime";
import Countdown from "@/components/Countdown";


type FormValues = {
  matriculation: number | null;
  nmec: number | null;
  has_payed: boolean | null;
};

function EventPill({ icon, text }: { icon: typeof faCalendarDay; text: string }) {
  return (
    <span className="flex items-center gap-2 text-sm text-white/50">
      <FontAwesomeIcon icon={icon} className="text-light-gold/60 text-xs" />
      {text}
    </span>
  );
}

function RegisterForm({ sessionUser, galaUserRefetch }: { sessionUser: any; galaUserRefetch: (u?: any) => void }) {
  const navigate = useNavigate();
  const [error, setError] = useState<boolean>(false);
  const inGala = !!sessionUser?.nmec;

  const methods = useForm<FormValues>({
    defaultValues: {
      matriculation: sessionUser?.matriculation ?? null,
      nmec: sessionUser?.nmec ?? null,
      has_payed: true,
    },
  });

  useEffect(() => {
    if (sessionUser) {
      methods.reset({ matriculation: sessionUser.matriculation, nmec: sessionUser.nmec, has_payed: true });
    }
  }, [sessionUser, methods]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const user = await GalaService.user.createUser({ nmec: data.nmec, matriculation: data.matriculation });
      galaUserRefetch(user);
    } catch {
      setError(true);
      return;
    }
    navigate("/vote");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="mt-10 w-full max-w-sm border border-light-gold/20 bg-black/50 p-6 backdrop-blur-md"
    >
      <p className="mb-4 font-gala text-xs uppercase tracking-widest text-light-gold/70">
        Regista-te no Gala
      </p>
      <FormProvider {...methods}>
        <form className="flex flex-col gap-4" onSubmit={methods.handleSubmit(onSubmit)}>
          <div className="font-gala">
            <label htmlFor="nmec" className="mb-1 block text-xs text-white/60">
              Número Mecanográfico
            </label>
            <Input
              id="nmec"
              className="w-full rounded-none px-4 py-2 font-gala text-black focus:outline-none focus:ring-1 focus:ring-light-gold/50"
              placeholder="Ex: 123456"
              disabled={inGala}
              {...methods.register("nmec", {
                required: "Obrigatório",
                pattern: { value: /^\d+$/, message: "Apenas números" },
              })}
            />
            {methods.formState.errors.nmec && (
              <p className="mt-1 text-xs text-red-400">{methods.formState.errors.nmec.message}</p>
            )}
          </div>
          <Button submit className="w-full font-gala text-sm font-bold">
            {inGala ? "Prosseguir para Votação" : "Registar e Votar"}
          </Button>
        </form>
      </FormProvider>
      {error && (
        <p className="mt-2 text-center text-xs text-red-500 font-gala">
          Ocorreu um erro ao processar o seu registo.
        </p>
      )}
    </motion.div>
  );
}

type StateValue = (typeof State)[keyof typeof State];

function HeroContent({ state, loginLink, sessionUser, galaUserRefetch }: {
  state: StateValue;
  loginLink: string;
  sessionUser: any;
  galaUserRefetch: (u?: any) => void;
}) {
  const { time } = useTime();

  // If user is not logged in, show general CTA
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

  // If user is logged in but not registered in the gala yet
  if (state === State.AUTHENTICATED) {
    return (
      <div className="flex flex-col items-center gap-8">
        <RegisterForm sessionUser={sessionUser} galaUserRefetch={galaUserRefetch} />
        {time?.galaStatus === TimeStatus.OPENING && (
          <Countdown targetDate={time.galaStart} label="O Grande Dia Começa Em" />
        )}
      </div>
    );
  }

  // If registered, show phase-specific buttons or countdowns
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
  const { state, sessionUser, isLoading, mutate: galaUserRefetch } = useSessionUser();
  const { date, time, location } = galaContent.eventInfo;

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
          <EventPill icon={faCalendarDay} text={date} />
          <span className="h-3 w-px bg-white/20" />
          <EventPill icon={faClock} text={time} />
          <span className="h-3 w-px bg-white/20" />
          <EventPill icon={faLocationDot} text={location} />
        </div>

        <HeroContent
          state={state}
          loginLink={loginLink}
          sessionUser={sessionUser}
          galaUserRefetch={galaUserRefetch}
        />
      </motion.div>

      <motion.a
        href="/#sobre"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-10 flex flex-col items-center gap-2 text-white/30 transition-colors hover:text-white/60"
      >
        <span className="font-gala text-[0.65rem] uppercase tracking-[0.3em]">Explorar</span>
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="h-4 w-px bg-white/30"
        />
      </motion.a>
    </section>
  );
}
