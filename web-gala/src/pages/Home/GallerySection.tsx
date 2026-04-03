import { motion } from "framer-motion";
import { galaContent } from "@/config/galaContent";

export default function GallerySection() {
  const { title, images } = galaContent.gallery;

  return (
    <section id="galeria" className="relative z-10 min-h-screen bg-black/80 px-4 py-20">
      <div className="mx-auto max-w-screen-xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-12 font-gala text-[2.5rem] font-bold text-light-gold sm:text-[3.5rem]"
        >
          {title}
        </motion.h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {images.map((imgSrc, idx) => (
            <motion.div
              key={imgSrc}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * idx, duration: 0.5 }}
              className="overflow-hidden rounded-xl border border-light-gold/20 shadow-xl"
            >
              <img
                src={imgSrc}
                alt={`Gala ano anterior ${idx + 1}`}
                className="h-64 w-full object-cover transition-transform duration-500 hover:scale-110"
                loading="lazy"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
