import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImages, faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import type { GalleryConfig } from "@/hooks/useHomepageConfig";

interface Props {
  galleryConfig: GalleryConfig;
}

export default function PhotoGallerySection({ galleryConfig }: Props) {
  if (!galleryConfig.visible || !galleryConfig.drive_url) return null;

  return (
    <section id="galeria" className="relative px-4 py-28">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <span className="font-gala text-sm font-bold uppercase tracking-[0.4em] text-light-gold/60">
            Momentos
          </span>
          <h2 className="mt-4 font-gala text-[3.5rem] font-black tracking-tight text-white sm:text-[4.5rem]">
            {galleryConfig.title}
          </h2>
          {galleryConfig.description && (
            <p className="mx-auto mt-6 max-w-xl font-gala text-lg text-white/50">
              {galleryConfig.description}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-3xl border border-white/10"
        >
          {galleryConfig.preview_photo_url ? (
            <img
              src={galleryConfig.preview_photo_url}
              alt="Galeria de fotos"
              className="h-[400px] w-full object-cover brightness-60"
            />
          ) : (
            <div className="flex h-[300px] w-full items-center justify-center bg-white/3">
              <FontAwesomeIcon icon={faImages} className="text-8xl text-white/8" />
            </div>
          )}

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/50 backdrop-blur-sm">
            <FontAwesomeIcon icon={faImages} className="text-5xl text-light-gold/60" />
            <p className="font-gala text-2xl font-bold text-white">Ver todas as fotos</p>
            <a
              href={galleryConfig.drive_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-light-gold/60 px-8 py-3 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black"
            >
              Abrir Galeria
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
