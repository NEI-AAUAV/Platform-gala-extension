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
        "Começa a escrever o nome de um colega e nós sugerimos algumas opções com base na base de dados de nomes. Os nomes sugeridos não indicam necessariamente que alguém indicou aquela pessoa para aquela categoria ou que essa pessoa já tenha sido indicada para outra categoria. Podes adicionar mesmo que não apareça na lista!",
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
      className="relative m-0 grid h-screen max-h-none w-screen max-w-none items-center overflow-y-auto bg-transparent p-0 text-white/70 backdrop:bg-black/90 backdrop:backdrop-blur-sm"
      onClose={onClose}
    >
      <AnimatePresence>
        {isOpen && (
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-light-gold/30 bg-[#0c0c0d] p-8 shadow-[0_0_50px_-12px_rgba(215,160,25,0.2)] sm:p-12"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative Background elements */}
              <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-light-gold/5 blur-[80px]" />
              <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-dark-gold/5 blur-[80px]" />

              <button
                type="button"
                onClick={onClose}
                className="absolute right-8 top-8 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/40 transition-all hover:border-light-gold/40 hover:bg-light-gold/10 hover:text-white"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>

              <div className="relative">
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-light-gold/20 to-dark-gold/10 text-light-gold shadow-inner ring-1 ring-light-gold/30">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-2xl" />
                  </div>
                  <h2 className="font-gala text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    Guia de Nomeações
                  </h2>
                  <p className="mt-4 font-gala text-base text-white/50">
                    Sabe como indicar os teus colegas para os Gala Awards
                  </p>
                </div>

                <div className="mt-12 space-y-8">
                  {steps.map((step, idx) => (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + idx * 0.1 }}
                      className="group flex gap-6"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-light-gold transition-colors group-hover:border-light-gold/30 group-hover:bg-light-gold/10">
                        <FontAwesomeIcon icon={step.icon} />
                      </div>
                      <div>
                        <h3 className="font-gala text-lg font-bold text-white/90">
                          {step.title}
                        </h3>
                        <p className="mt-1 font-gala text-sm leading-relaxed text-white/40">
                          {step.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-16 flex flex-col items-center gap-6 border-t border-white/10 pt-10">
                  <button
                    type="button"
                    onClick={onClose}
                    className="group relative w-full overflow-hidden rounded-xl border border-light-gold/50 bg-light-gold/10 py-4 font-gala text-sm font-bold uppercase tracking-widest text-light-gold transition-all hover:border-light-gold hover:bg-light-gold/20 active:scale-[0.98] sm:w-64"
                  >
                    <span className="relative z-10">Entendido!</span>
                  </button>
                  <p className="font-gala text-[0.65rem] uppercase tracking-[0.2em] text-white/20">
                    Podes fechar este guia para começar
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
