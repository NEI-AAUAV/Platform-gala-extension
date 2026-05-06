import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBus,
  faClock,
  faLocationDot,
} from "@fortawesome/free-solid-svg-icons";
import type { BusScheduleConfig } from "@/hooks/useHomepageConfig";

interface Props {
  readonly busConfig: BusScheduleConfig;
}

export default function BusSection({ busConfig }: Props) {
  if (!busConfig.visible) return null;

  return (
    <section id="autocarros" className="relative px-4 py-28">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <span className="font-gala text-sm font-bold uppercase tracking-[0.4em] text-light-gold/60">
            Transporte
          </span>
          <h2 className="mt-4 font-gala text-[3.5rem] font-black tracking-tight text-white sm:text-[4.5rem]">
            Autocarros
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ScheduleInfo busConfig={busConfig} />
          <BusList buses={busConfig.buses} />
        </div>
      </div>
    </section>
  );
}

function ScheduleInfo({
  busConfig,
}: {
  readonly busConfig: BusScheduleConfig;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6 }}
      className="border-white/8 bg-white/3 flex flex-col gap-6 rounded-2xl border p-8 lg:col-span-1"
    >
      <FontAwesomeIcon icon={faBus} className="text-3xl text-light-gold/50" />

      <div className="flex flex-col gap-5">
        {busConfig.departure_location && (
          <ScheduleLine
            icon={faLocationDot}
            label="Ponto de partida"
            value={busConfig.departure_location}
          />
        )}
        {busConfig.departure_time && (
          <ScheduleLine
            icon={faClock}
            label="Hora de partida"
            value={busConfig.departure_time}
          />
        )}
        {busConfig.return_time && (
          <ScheduleLine
            icon={faClock}
            label="Regresso"
            value={busConfig.return_time}
          />
        )}
      </div>
    </motion.div>
  );
}

function ScheduleLine({
  icon,
  label,
  value,
}: {
  readonly icon: typeof faBus;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <FontAwesomeIcon
        icon={icon}
        className="mt-0.5 w-3.5 flex-shrink-0 text-light-gold/40"
      />
      <div>
        <p className="text-white/35 font-gala text-[0.6rem] font-bold uppercase tracking-widest">
          {label}
        </p>
        <p className="font-gala text-sm font-semibold text-white/75">{value}</p>
      </div>
    </div>
  );
}

function BusList({ buses }: { readonly buses: BusScheduleConfig["buses"] }) {
  if (buses.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: 0.1, duration: 0.6 }}
      className="border-white/8 bg-white/3 flex flex-col gap-4 rounded-2xl border p-8 lg:col-span-2"
    >
      <p className="font-gala text-xs font-bold uppercase tracking-[0.3em] text-white/40">
        Autocarros disponíveis
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {buses.map((bus, i) => (
          <motion.div
            key={bus.id}
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07, duration: 0.5 }}
            className="border-white/6 bg-white/3 flex items-center justify-between rounded-xl border px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faBus} className="text-light-gold/40" />
              <span className="font-gala text-sm font-bold text-white/80">
                {bus.name}
              </span>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 font-gala text-xs text-white/40">
              {bus.capacity} lugares
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
