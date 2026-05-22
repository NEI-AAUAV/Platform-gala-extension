import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useVotes from "@/hooks/voteHooks/useVotes";
import type { NominationsDisplayConfig } from "@/hooks/useHomepageConfig";
import config from "@/config";

interface Props {
  readonly nominationsConfig: NominationsDisplayConfig;
}

const getPhotoUrl = (photo_path: string | undefined | null) => {
  if (!photo_path) return "/default-profile.svg";
  return photo_path.startsWith("http")
    ? photo_path
    : `${config.BASE_URL}/gala/categories/${photo_path}`;
};

export default function NominationsSection({ nominationsConfig }: Props) {
  const { votes } = useVotes();

  if (!nominationsConfig.visible || votes.length === 0) return null;

  return (
    <section
      id="nomeacoes"
      className="relative py-4 lg:py-6 snap-start scroll-mt-24"
    >
      <SectionHeader />

      {nominationsConfig.show_nominees ? (
        <NomineesVisualShowcase votes={votes} />
      ) : (
        <CategoriesCarousel votes={votes} />
      )}
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
      className="mb-4 px-4 text-center lg:mb-5"
    >
      <span className="font-gala text-sm font-bold uppercase tracking-[0.4em] text-light-gold/60">
        Prémios da Noite
      </span>
      <h2 className="mt-2 font-gala text-[2.2rem] font-black tracking-tight text-white sm:text-[3rem] lg:text-[3.4rem]">
        Categorias
      </h2>
    </motion.div>
  );
}

function CategoriesCarousel({ votes }: { readonly votes: Vote[] }) {
  const [active, setActive] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (votes.length <= 1) return undefined;
    intervalRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % votes.length);
    }, 3500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [votes.length]);

  if (votes.length === 0) return null;

  return (
    <div className="px-4">
      <div className="relative h-[280px] w-full overflow-hidden rounded-2xl border border-light-gold/15">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.97 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
          >
            <h3 className="font-gala text-[2rem] font-black leading-tight text-white sm:text-[3rem]">
              {votes[active].category}
            </h3>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function NomineesVisualShowcase({ votes }: { readonly votes: Vote[] }) {
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const [activeNomineeIdx, setActiveNomineeIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const touchStartX = useRef<number | null>(null);

  const activeCategory = votes[activeCategoryIdx];
  const nominees = activeCategory?.options ?? [];
  const photos = activeCategory?.photo_paths ?? [];

  const currentPhoto = useMemo(
    () => getPhotoUrl(photos[activeNomineeIdx]),
    [photos, activeNomineeIdx],
  );

  const goToCategory = (nextIdx: number, nextDirection: 1 | -1) => {
    if (votes.length === 0) return;
    const normalized = (nextIdx + votes.length) % votes.length;
    setDirection(nextDirection);
    setActiveCategoryIdx(normalized);
    setActiveNomineeIdx(0);
  };

  const goToNominee = (nextIdx: number) => {
    if (nominees.length === 0) return;
    const normalized = (nextIdx + nominees.length) % nominees.length;
    setActiveNomineeIdx(normalized);
  };

  useEffect(() => {
    if (votes.length <= 1) return undefined;
    const timer = setInterval(() => {
      setDirection(1);
      setActiveCategoryIdx((prev) => (prev + 1) % votes.length);
      setActiveNomineeIdx(0);
    }, 9000);
    return () => clearInterval(timer);
  }, [votes.length]);

  useEffect(() => {
    if (nominees.length <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveNomineeIdx((prev) => (prev + 1) % nominees.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [nominees.length, activeCategoryIdx]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current == null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    if (Math.abs(delta) > 60) {
      if (delta < 0) goToCategory(activeCategoryIdx + 1, 1);
      else goToCategory(activeCategoryIdx - 1, -1);
    }
    touchStartX.current = null;
  };

  if (votes.length === 0 || nominees.length === 0) return null;

  return (
    <div className="w-full">
      <div
        className="relative h-[calc(100svh-170px)] max-h-[900px] w-full overflow-hidden rounded-none border-y border-light-gold/30 bg-gradient-to-r from-[#1e1510] via-[#5c3a22] to-[#24150f] lg:h-[calc(100svh-185px)]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="pointer-events-none absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            <motion.img
              key={`${activeCategoryIdx}-${activeNomineeIdx}-bg`}
              src={currentPhoto}
              alt=""
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 0.32, scale: 1.02 }}
              exit={{ opacity: 0, scale: 1.08 }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="h-full w-full object-cover blur-3xl"
            />
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`category-shell-${activeCategoryIdx}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
            className="relative z-10 flex h-full w-full flex-col lg:flex-row"
          >
          <div className="relative flex w-full flex-col justify-between p-5 lg:w-[65%] lg:p-10">
            <div className="z-20 rounded-xl bg-black/30 p-4 backdrop-blur-sm lg:rounded-none lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
              <h3 className="max-w-[16ch] font-gala text-[2.25rem] font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                {activeCategory.category}
              </h3>
              {activeCategory.description && (
                <p className="mt-3 max-w-2xl font-gala text-base text-white/90 lg:text-base">
                  {activeCategory.description}
                </p>
              )}
            </div>

            <div className="z-20 mt-8 max-w-2xl space-y-2.5 lg:mt-10">
              {nominees.map((name, i) => (
                <motion.button
                  key={`${name}-${i}`}
                  type="button"
                  onClick={() => goToNominee(i)}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                  className={[
                    "block text-left font-gala text-[2.5rem] font-semibold leading-[1.05] transition-all duration-300 sm:text-3xl lg:text-4xl",
                    i === activeNomineeIdx
                      ? "text-white"
                      : "text-white/75 hover:text-white",
                  ].join(" ")}
                >
                  {name}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="absolute inset-0 -z-0 overflow-hidden lg:relative lg:inset-auto lg:w-[35%]">
            <AnimatePresence mode="wait">
              <motion.img
                key={`${activeCategoryIdx}-${activeNomineeIdx}-panel-blur`}
                src={currentPhoto}
                alt=""
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.38 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="pointer-events-none absolute inset-0 z-0 h-full w-full scale-110 object-cover blur-3xl"
              />
            </AnimatePresence>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.img
                key={`${activeCategoryIdx}-${activeNomineeIdx}-photo`}
                src={currentPhoto}
                alt={nominees[activeNomineeIdx]}
                custom={direction}
                initial={{ x: direction === 1 ? 80 : -80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction === 1 ? -80 : 80, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                className="relative z-10 h-full w-full object-cover"
              />
            </AnimatePresence>

            <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-black/55 via-black/30 to-black/75 lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-[#20130d]/75" />
          </div>
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={() => goToCategory(activeCategoryIdx - 1, -1)}
          aria-label="Categoria anterior"
          className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/30 bg-black/40 p-3 text-white backdrop-blur transition hover:bg-black/60"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => goToCategory(activeCategoryIdx + 1, 1)}
          aria-label="Próxima categoria"
          className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/30 bg-black/40 p-3 text-white backdrop-blur transition hover:bg-black/60"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="absolute bottom-4 left-1/2 z-20 w-[92%] max-w-[420px] -translate-x-1/2 rounded-2xl bg-black/40 p-4 backdrop-blur-md lg:w-auto lg:max-w-none lg:rounded-none lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          {activeCategory.voting_open ? (
            <Link
              to="/vote"
              className="mx-auto block w-fit rounded-full bg-gradient-to-r from-[#f3d892] to-[#b8842f] px-8 py-3 font-gala text-sm font-bold uppercase tracking-wide text-black shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition hover:from-[#f7e1a8] hover:to-[#c8953e]"
            >
              Votar nesta Categoria
            </Link>
          ) : (
            <div className="rounded-full border border-light-gold/40 bg-black/45 px-8 py-3 font-gala text-xs font-semibold uppercase tracking-wide text-light-gold/90 backdrop-blur">
              Votações Abrem Brevemente
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex w-full justify-center px-4">
        <div className="flex w-fit items-center gap-2.5 rounded-full border border-light-gold/35 bg-black/35 px-4 py-2.5 backdrop-blur">
          {votes.map((vote, idx) => (
            <button
              key={vote._id}
              type="button"
              onClick={() => goToCategory(idx, idx > activeCategoryIdx ? 1 : -1)}
              aria-label={`Ir para categoria ${idx + 1}`}
              className={[
                "h-1.5 w-8 rounded-full transition-all duration-300",
                idx === activeCategoryIdx
                  ? "bg-light-gold shadow-[0_0_10px_rgba(209,176,93,0.8)]"
                  : "bg-white/35 hover:bg-white/60",
              ].join(" ")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
