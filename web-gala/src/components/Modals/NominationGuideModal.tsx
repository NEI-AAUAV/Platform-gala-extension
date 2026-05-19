import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faUsers,
  faPaperPlane,
  faXmark,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export default function NominationGuideModal({ isOpen, onClose }: Props) {
  const modalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      modalRef.current?.close();
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  const steps = [
    {
      icon: faSearch,
      title: "Pesquisa por Autocomplete",
      description:
        "Começa a escrever o nome de um colega e nós sugerimos algumas opções. Podes adicionar mesmo que não apareça na lista!",
    },
    {
      icon: faUsers,
      title: "Várias Categorias",
      description:
        "Cada categoria tem os seus requisitos (ex: mínimo 1, máximo 3 nomes). Podes preencher várias categorias antes de submeter.",
    },
    {
      icon: faPaperPlane,
      title: "Submissão Final",
      description:
        "Não te esqueças de carregar no botão 'Submeter Todas' no fundo da página!",
    },
  ];

  return (
    <dialog
      ref={modalRef}
      className="relative m-0 grid h-screen max-h-none w-screen max-w-none items-center overflow-y-auto bg-transparent p-0 text-gala-white/70 backdrop:bg-black/90 backdrop:backdrop-blur-md"
      onClose={onClose}
    >
      <AnimatePresence>
        {isOpen && (
          <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="relative w-full max-w-xl overflow-hidden rounded-[1.5rem] border border-light-gold/20 bg-gradient-to-br from-[#1a1713] via-green-dark to-[#0e2a1e] p-6 shadow-2xl backdrop-blur-2xl sm:rounded-[2rem] sm:p-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Theme Ornaments */}
              <div className="pcb-corner tl opacity-50" />
              <div className="pcb-corner tr opacity-50" />
              <div className="pcb-corner bl opacity-50" />
              <div className="pcb-corner br opacity-50" />

              {/* Decorative Background Glows */}
              <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-light-gold/5 blur-[100px]" />
              <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-light-gold/5 blur-[100px]" />

              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/5 text-white/30 transition-all hover:border-light-gold/40 hover:bg-light-gold/10 hover:text-white sm:right-6 sm:top-6 sm:h-10 sm:w-10"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>

              <div className="relative">
                <div className="mb-6 text-center sm:mb-8">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-light-gold/20 to-dark-gold/10 text-light-gold shadow-inner ring-1 ring-light-gold/30 sm:h-16 sm:w-16 sm:rounded-2xl">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-xl sm:text-2xl" />
                  </div>
                  <h2 className="font-gala text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Guia de Nomeações
                  </h2>
                  <p className="mt-2 font-gala text-sm text-gala-white/50 sm:mt-4 sm:text-base">
                    Sabe como indicar os teus colegas para os Gala Awards
                  </p>
                </div>

                <div className="mt-8 space-y-6 sm:mt-12 sm:space-y-8">
                  {steps.map((step, idx) => (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + idx * 0.1 }}
                      className="group flex gap-4 sm:gap-6"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-green-light/20 text-light-gold transition-colors group-hover:border-light-gold/30 group-hover:bg-light-gold/10 sm:h-12 sm:w-12 sm:rounded-xl">
                        <FontAwesomeIcon icon={step.icon} className="text-sm sm:text-base" />
                      </div>
                      <div>
                        <h3 className="font-gala text-base font-bold text-white/90 sm:text-lg">
                          {step.title}
                        </h3>
                        <p className="mt-1 font-gala text-xs leading-relaxed text-gala-white/40 sm:text-sm">
                          {step.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col items-center gap-4 border-t border-white/10 pt-6 sm:mt-12 sm:gap-6 sm:pt-10">
                  <button
                    type="button"
                    onClick={onClose}
                    className="group relative w-full overflow-hidden rounded-lg border border-light-gold/50 bg-light-gold/10 py-3.5 font-gala text-xs font-bold uppercase tracking-widest text-light-gold transition-all hover:border-light-gold hover:bg-light-gold/20 active:scale-[0.98] sm:rounded-xl sm:py-4 sm:text-sm"
                  >
                    <span className="relative z-10">Entendido!</span>
                  </button>
                  <p className="font-gala text-[0.6rem] uppercase tracking-[0.2em] text-gala-white/20 sm:text-[0.65rem]">
                    Fecha este guia para começar
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </dialog>
  );
}
