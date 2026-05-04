import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { galaContent } from "@/config/galaContent";

export default function AboutSection() {
  const { title, description, callToAction } = galaContent.about;

  return (
    <section
      id="sobre"
      className="relative flex min-h-screen items-center justify-center px-4 py-20 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-4xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="font-gala text-[2.5rem] font-bold text-light-gold drop-shadow-md sm:text-[3.5rem]"
        >
          {title}
        </motion.h2>

        <div className="mt-8 space-y-6 font-gala text-lg text-white/80 sm:text-xl">
          {description.map((p, idx) => (
            <motion.p
              key={p.substring(0, 20)}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 * (idx + 1), duration: 0.8 }}
            >
              {p}
            </motion.p>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-12"
        >
          <Link
            to="/reserve"
            className="inline-block rounded-full bg-light-gold px-8 py-4 font-gala text-[1.1rem] font-bold text-black shadow-lg transition-transform hover:scale-105"
          >
            {callToAction}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
