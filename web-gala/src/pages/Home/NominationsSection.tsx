import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useVotes from "@/hooks/voteHooks/useVotes";
import type { NominationsDisplayConfig } from "@/hooks/useHomepageConfig";

interface Props {
  readonly nominationsConfig: NominationsDisplayConfig;
}

export default function NominationsSection({ nominationsConfig }: Props) {
  const { votes } = useVotes();

  if (!nominationsConfig.visible || votes.length === 0) return null;

  return (
    <section id="nomeacoes" className="relative px-4 py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeader />
        <CategoriesCarousel votes={votes} />
        {nominationsConfig.show_nominees && <NomineesGrid votes={votes} />}
      </div>
    </section>
  );
}

function SectionHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8 }}
      className="mb-20 text-center"
    >
      <span className="font-gala text-sm font-bold uppercase tracking-[0.4em] text-light-gold/60">
        Prémios da Noite
      </span>
      <h2 className="mt-4 font-gala text-[3.5rem] font-black tracking-tight text-white sm:text-[4.5rem]">
        Categorias
      </h2>
    </motion.div>
  );
}

function CategoriesCarousel({ votes }: { readonly votes: Vote[] }) {
  const [active, setActive] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoPlay = () => {
    intervalRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % votes.length);
    }, 3500);
  };

  useEffect(() => {
    if (votes.length <= 1) return undefined;
    startAutoPlay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [votes.length]);

  const handleSelect = (idx: number) => {
    setActive(idx);
    if (intervalRef.current) clearInterval(intervalRef.current);
    startAutoPlay();
  };

  if (votes.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-12">
      <div className="relative h-[280px] w-full max-w-3xl overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.97 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
          >
            <span className="mb-4 font-gala text-[4.5rem] font-black italic leading-none text-light-gold/10 sm:text-[6rem]">
              {String(active + 1).padStart(2, "0")}
            </span>
            <h3 className="font-gala text-[2rem] font-black leading-tight text-white sm:text-[3rem]">
              {votes[active].category}
            </h3>
            {votes[active].options.length > 0 && (
              <p className="mt-4 font-gala text-sm text-white/40">
                {votes[active].options.length} nomeado
                {votes[active].options.length === 1 ? "" : "s"}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {votes.map((vote, idx) => (
          <button
            key={vote._id}
            type="button"
            onClick={() => handleSelect(idx)}
            className={[
              "rounded-full border px-4 py-1.5 font-gala text-xs font-semibold transition-all duration-300",
              active === idx
                ? "border-light-gold bg-light-gold/10 text-light-gold"
                : "border-light-gold/20 text-white/30 hover:border-white/25 hover:text-white/60",
            ].join(" ")}
          >
            {vote.category}
          </button>
        ))}
      </div>
    </div>
  );
}

function NomineesGrid({ votes }: { readonly votes: Vote[] }) {
  return (
    <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {votes.map((vote, idx) => (
        <CategoryNominees key={vote._id} vote={vote} index={idx} />
      ))}
    </div>
  );
}

function CategoryNominees({
  vote,
  index,
}: {
  readonly vote: Vote;
  readonly index: number;
}) {
  const nominees = vote.options.length > 0 ? vote.options : [];
  if (nominees.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.07, duration: 0.6 }}
      className="bg-white/3 border border-light-gold/20 p-6"
    >
      <p className="mb-1 font-gala text-[0.6rem] font-bold uppercase tracking-[0.35em] text-light-gold/50">
        Categoria
      </p>
      <h3 className="mb-5 font-gala text-xl font-bold text-white">
        {vote.category}
      </h3>
      <ul className="flex flex-col gap-2">
        {nominees.map((name, i) => (
          <li
            key={name}
            className="border-light-gold/15 bg-white/3 flex items-center gap-3 border px-4 py-2.5"
          >
            <span className="font-gala text-xs font-bold text-light-gold/40">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="font-gala text-sm font-semibold text-white/75">
              {name}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
