import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faIdCard,
  faXmark,
  faInfoCircle,
  faListCheck,
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

  const rules = [
    {
      icon: faIdCard,
      title: "Escreve o nome corretamente",
      description:
        "Usa primeiro e último nome (ex: Joao Silva). Evita alcunhas, iniciais ou nomes incompletos. Não te esqueças de dar Enter no final de cada nome para registar a nomeação!",
    },
    {
      icon: faListCheck,
      title: "Respeita os limites da categoria",
      description:
        "Cada categoria mostra o numero minímo e máximo de nomeados permitidos.",
    },
    {
      icon: faCircleCheck,
      title: "Confirma antes de enviar",
      description:
        "Podes preencher varias categorias e submeter todas de uma vez no final da pagina.",
    },
  ];

  return (
    <dialog
      ref={modalRef}
      className="relative m-0 grid h-screen max-h-none w-screen max-w-none items-center overflow-y-auto bg-transparent p-0 text-gala-white/70 backdrop:bg-black/70 backdrop:backdrop-blur-[2px]"
      onClose={onClose}
    >
      <AnimatePresence>
        {isOpen && (
          <div className="h-dvh flex items-center justify-center p-3 sm:min-h-screen sm:p-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="relative w-full max-w-lg overflow-hidden border border-light-gold/20 bg-gradient-to-br from-[#181512] via-[#123126] to-[#0f221a] p-4 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.55)] sm:max-w-xl sm:p-6"
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
                <div className="mb-3 text-center sm:mb-5">
                  <div className="ring-light-gold/35 mx-auto mb-2 flex h-9 w-9 items-center justify-center bg-gradient-to-br from-light-gold/25 to-dark-gold/10 text-light-gold shadow-inner ring-1 sm:h-10 sm:w-10">
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      className="text-sm sm:text-2xl"
                    />
                  </div>
                  <h2 className="font-gala text-lg font-bold tracking-tight text-white sm:text-2xl">
                    Como funcionam as nomeações?
                  </h2>
                </div>

                <div className="mt-2 space-y-1.5 sm:mt-3 sm:space-y-2">
                  {rules.map((rule, idx) => (
                    <motion.div
                      key={rule.title}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + idx * 0.1 }}
                      className="group flex items-start gap-2 px-1 py-1.5 transition-colors sm:gap-2.5"
                    >
                      <div className="bg-light-gold/15 flex h-6 w-6 shrink-0 items-center justify-center text-light-gold sm:h-7 sm:w-7">
                        <FontAwesomeIcon
                          icon={rule.icon}
                          className="text-[0.65rem] sm:text-base"
                        />
                      </div>
                      <div>
                        <h3 className="font-gala text-[0.76rem] font-bold leading-tight text-white/90 sm:text-sm">
                          {rule.title}
                        </h3>
                        <p className="text-gala-white/45 mt-0.5 font-gala text-[0.65rem] leading-snug sm:text-xs">
                          {rule.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-3 flex flex-col items-center gap-1.5 border-t border-white/10 pt-3 sm:mt-4 sm:gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="border-light-gold/45 group relative w-full overflow-hidden border bg-light-gold/10 py-2 font-gala text-[0.62rem] font-bold uppercase tracking-[0.16em] text-light-gold transition-all hover:border-light-gold hover:bg-light-gold/20 active:scale-[0.98] sm:py-2.5 sm:text-xs sm:tracking-[0.18em]"
                  >
                    <span className="relative z-10">Entendido!</span>
                  </button>
                  <p className="font-gala text-[0.54rem] uppercase tracking-[0.16em] text-gala-white/20 sm:text-[0.65rem] sm:tracking-[0.2em]">
                    Fecha este guia e comeca a nomear
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
