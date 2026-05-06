import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDay,
  faClock,
  faLocationDot,
  faUserTie,
} from "@fortawesome/free-solid-svg-icons";
import { galaContent } from "@/config/galaContent";

export default function EventInfoSection() {
  const { title, date, time, location, dressCode } = galaContent.eventInfo;

  const infoBoxes = [
    { icon: faCalendarDay, label: "Data", value: date },
    { icon: faClock, label: "Hora", value: time },
    { icon: faLocationDot, label: "Local", value: location },
    { icon: faUserTie, label: "Dress Code", value: dressCode },
  ];

  return (
    <section
      id="evento"
      className="relative flex flex-col items-center justify-center px-4 py-20 backdrop-blur-md"
    >
      <div className="mx-auto w-full max-w-5xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-14 font-gala text-[2.5rem] font-bold text-light-gold sm:text-[3.5rem]"
        >
          {title}
        </motion.h2>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {infoBoxes.map((info) => (
            <motion.div
              key={info.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: 0.1 * infoBoxes.indexOf(info),
                duration: 0.6,
              }}
              className="flex flex-col items-center justify-center rounded-2xl border border-light-gold/10 bg-black/40 p-8 shadow-lg backdrop-blur-sm transition-colors hover:border-light-gold/30 hover:bg-black/60"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-light-gold to-dark-gold text-2xl text-black shadow-inner">
                <FontAwesomeIcon icon={info.icon} />
              </div>
              <h3 className="font-gala text-lg font-bold uppercase tracking-widest text-white/90">
                {info.label}
              </h3>
              <p className="mt-2 font-gala text-base text-neutral-300 ">
                {info.value}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
