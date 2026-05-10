import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMartiniGlass } from "@fortawesome/free-solid-svg-icons";
import type { AfterPartyConfig } from "@/hooks/useHomepageConfig";

interface Props {
  readonly afterPartyConfig: AfterPartyConfig;
}

export default function AfterPartySection({ afterPartyConfig }: Props) {
  if (!afterPartyConfig.visible) return null;

  return (
    <section id="afterparty" className="relative px-4 py-28">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <span className="font-gala text-sm font-bold uppercase tracking-[0.4em] text-light-gold/60">
            Continua a festa
          </span>
          <h2 className="mt-4 font-gala text-[3.5rem] font-black tracking-tight text-white sm:text-[4.5rem]">
            {afterPartyConfig.title}
          </h2>
          {afterPartyConfig.description && (
            <p className="text-white/55 mx-auto mt-6 max-w-xl font-gala text-lg">
              {afterPartyConfig.description}
            </p>
          )}
        </motion.div>

        {afterPartyConfig.drinks.length > 0 && (
          <DrinksList drinks={afterPartyConfig.drinks} />
        )}
      </div>
    </section>
  );
}

function DrinksList({ drinks }: { readonly drinks: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7 }}
    >
      <p className="mb-6 text-center font-gala text-xs font-bold uppercase tracking-[0.4em] text-white/30">
        Bar aberto inclui
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {drinks.map((drink, i) => (
          <motion.div
            key={drink}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className="flex items-center gap-2 rounded-full border border-light-gold/20 bg-light-gold/5 px-5 py-2.5"
          >
            <FontAwesomeIcon
              icon={faMartiniGlass}
              className="text-xs text-light-gold/50"
            />
            <span className="font-gala text-sm font-semibold text-white/75">
              {drink}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
