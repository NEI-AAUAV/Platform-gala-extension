import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDay,
  faClock,
  faLocationDot,
  faTag,
  faCheck,
  faTriangleExclamation,
  faCalendarPlus,
  faCalendarXmark,
} from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";
import { RegistrationConfig } from "@/config/registrationConfig";
import useTime from "@/hooks/timeHooks/useTime";
import { formatDateTimePT } from "@/utils/formatDate";

interface Props {
  readonly config: RegistrationConfig;
  readonly onNext: () => void;
}

function InfoCard({
  icon,
  label,
  value,
}: Readonly<{ icon: typeof faCalendarDay; label: string; value: string }>) {
  return (
    <div className="border-white/8 bg-white/4 flex items-start gap-3 rounded-xl border p-4">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-light-gold/10">
        <FontAwesomeIcon icon={icon} className="text-xs text-light-gold" />
      </div>
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/40">
          {label}
        </p>
        <p className="mt-0.5 font-gala text-sm font-semibold text-white/80">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function Step1EventInfo({ config, onNext }: Readonly<Props>) {
  const { time } = useTime();
  const registrationOpen = time
    ? formatDateTimePT(time.registrationStart)
    : "A anunciar";
  const registrationClose = time
    ? formatDateTimePT(time.registrationEnd)
    : "A anunciar";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-8"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Column 1 — Event details */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
            Detalhes do Evento
          </h3>
          <div className="flex flex-col gap-3">
            <InfoCard
              icon={faCalendarDay}
              label="Data"
              value={config.eventDate}
            />
            <InfoCard icon={faClock} label="Horário" value={config.eventTime} />
            <InfoCard
              icon={faLocationDot}
              label="Local"
              value={config.eventLocation}
            />
            <InfoCard
              icon={faTag}
              label="Preço"
              value={
                config.eventPrice === 0 ? "A anunciar" : `${config.eventPrice}€`
              }
            />
          </div>
        </div>

        {/* Column 2 — Includes */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
            O que está incluído
          </h3>
          <div className="border-white/8 bg-white/4 rounded-xl border p-5">
            <ul className="flex flex-col gap-3">
              {config.eventIncludes.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-dark-gold/20">
                    <FontAwesomeIcon
                      icon={faCheck}
                      className="text-[0.55rem] text-dark-gold"
                    />
                  </span>
                  <span className="text-sm text-white/70">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Column 3 — Rules + Dates */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-light-gold/60">
            Regras e Datas
          </h3>
          <div className="flex flex-col gap-3">
            <div className="border-white/8 bg-white/4 rounded-xl border p-5">
              <ul className="flex flex-col gap-3">
                {config.eventRules.map((rule) => (
                  <li key={rule} className="flex items-start gap-3">
                    <FontAwesomeIcon
                      icon={faTriangleExclamation}
                      className="mt-0.5 flex-shrink-0 text-[0.6rem] text-light-gold/40"
                    />
                    <span className="text-sm text-white/60">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="border-white/8 bg-white/4 flex flex-col gap-1.5 rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={faCalendarPlus}
                    className="text-[0.65rem] text-light-gold/50"
                  />
                  <span className="text-[0.6rem] uppercase tracking-widest text-white/40">
                    Abertura
                  </span>
                </div>
                <span className="text-xs font-semibold text-white/70">
                  {registrationOpen}
                </span>
              </div>
              <div className="border-white/8 bg-white/4 flex flex-col gap-1.5 rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={faCalendarXmark}
                    className="text-[0.65rem] text-light-gold/50"
                  />
                  <span className="text-[0.6rem] uppercase tracking-widest text-white/40">
                    Fecho
                  </span>
                </div>
                <span className="text-xs font-semibold text-white/70">
                  {registrationClose}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black"
        >
          Prosseguir para Inscrição →
        </button>
      </div>
    </motion.div>
  );
}
