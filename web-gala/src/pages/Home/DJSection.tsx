import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMusic } from "@fortawesome/free-solid-svg-icons";
import type { DJConfig } from "@/hooks/useHomepageConfig";

interface Props {
  readonly djConfig: DJConfig;
}

export default function DJSection({ djConfig }: Props) {
  if (!djConfig.visible) return null;

  return (
    <section id="dj" className="relative px-4 py-28">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <span className="font-gala text-sm font-bold uppercase tracking-[0.4em] text-light-gold/60">
            A Música da Noite
          </span>
          <h2 className="mt-4 font-gala text-[3.5rem] font-black tracking-tight text-white sm:text-[4.5rem]">
            DJ
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
          <DJPhoto photoUrl={djConfig.photo_url} name={djConfig.name} />
          <DJInfo djConfig={djConfig} />
        </div>
      </div>
    </section>
  );
}

function DJPhoto({ photoUrl, name }: { readonly photoUrl: string | null; readonly name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="relative aspect-square w-full max-w-sm mx-auto overflow-hidden rounded-3xl border border-white/10"
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-[2000ms] hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-white/3">
          <FontAwesomeIcon icon={faMusic} className="text-6xl text-white/10" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
    </motion.div>
  );
}

function DJInfo({ djConfig }: { readonly djConfig: DJConfig }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col justify-center gap-8"
    >
      <div>
        <p className="font-gala text-xs font-bold uppercase tracking-[0.4em] text-light-gold/50">
          A animar a noite
        </p>
        <h3 className="mt-3 font-gala text-4xl font-black text-white sm:text-5xl">
          {djConfig.name || "A anunciar"}
        </h3>
      </div>

      {djConfig.bio && (
        <p className="font-gala text-lg leading-relaxed text-white/65">{djConfig.bio}</p>
      )}

      {djConfig.spotify_url && (
        <a
          href={djConfig.spotify_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex w-fit items-center gap-3 rounded-full border border-[#1DB954]/40 bg-[#1DB954]/8 px-6 py-3 font-gala text-sm font-bold text-[#1DB954] transition-all hover:border-[#1DB954]/70 hover:bg-[#1DB954]/15"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          Ouvir Playlist
        </a>
      )}
    </motion.div>
  );
}
