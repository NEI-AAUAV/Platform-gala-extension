import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import classNames from "classnames";
import {
  faCheckCircle,
  faExclamationCircle,
  faPaperPlane,
  faSpinner,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/Button";
import VoteCard from "@/components/VoteCard";
import useVotes from "@/hooks/voteHooks/useVotes";
import postVoteCast from "@/hooks/voteHooks/useVoteCast";
import useSessionUser, { State } from "@/hooks/userHooks/useSessionUser";
import VotingGuideModal from "@/components/Modals/VotingGuideModal";
import useLoginLink from "@/hooks/useLoginLink";
import { useUserStore } from "@/stores/useUserStore";

type FormVotes = {
  [x: number]: {
    _id: number;
    already_voted: boolean;
    option: number | null;
  };
};

type FormValues = {
  votes: FormVotes;
};

function resolveVoteError(reason: unknown): string {
  if (typeof reason === "object" && reason !== null) {
    const r = reason as {
      response?: { status?: number; data?: { detail?: string } };
    };
    const status = r.response?.status;
    if (status === 403)
      return "A votação ainda não está aberta para esta categoria.";
    if (status === 409) return "Já votaste nesta categoria.";
    const detail = r.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return "Erro desconhecido. Tenta novamente.";
}

export default function Vote() {
  const { state, sessionUser } = useSessionUser();
  const { token } = useUserStore();
  const loginLink = useLoginLink();
  const { votes: allVotes, mutate } = useVotes();
  const votes = useMemo(
    () => allVotes.filter((v) => !v.nomination_open),
    [allVotes],
  );
  const hasVotingCategories = votes.length > 0;
  const allVoted = useMemo(
    () =>
      votes.length > 0 &&
      votes
        .filter((v) => v.revealed && v.options.length > 0)
        .every((v) => v.already_voted !== null),
    [votes],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const guideSeenKey = "gala_voting_guide_seen";

  useEffect(() => {
    if (state === State.REGISTERED && sessionUser?.registration_active !== false) {
      const hasSeenGuide = localStorage.getItem(guideSeenKey);
      if (!hasSeenGuide) {
        setIsGuideOpen(true);
      }
    }
  }, [state, sessionUser?.registration_active]);

  const closeGuide = () => {
    setIsGuideOpen(false);
    localStorage.setItem(guideSeenKey, "true");
  };

  const methods = useForm<FormValues>({
    defaultValues: { votes: {} },
  });

  useEffect(() => {
    methods.reset({
      votes: votes.reduce((obj: FormVotes, vote) => {
        const newObj = { ...obj };
        newObj[vote._id] = {
          _id: vote._id,
          already_voted: vote.already_voted !== null,
          option: vote.already_voted,
        };
        return newObj;
      }, {}),
    });
  }, [votes, methods.reset]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    setFeedback(null);

    const votesToCast = Object.values(data.votes).filter(
      (vote) => vote.option !== null && !vote.already_voted,
    );

    if (votesToCast.length === 0) {
      setFeedback({
        type: "error",
        message: "Por favor seleciona as pessoas em quem queres votar!",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const results = await Promise.allSettled(
        votesToCast.map((vote) =>
          postVoteCast(vote._id, { option: vote.option! }),
        ),
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const rejections = results.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      );

      const errorMessage =
        rejections.length > 0 ? resolveVoteError(rejections[0].reason) : null;

      if (rejections.length === 0) {
        setFeedback({
          type: "success",
          message: `${successful} ${
            successful === 1 ? "voto submetido" : "votos submetidos"
          } com sucesso!`,
        });
      } else if (successful > 0) {
        const suffix = errorMessage ? `. ${errorMessage}` : ".";
        setFeedback({
          type: "error",
          message: `${successful} ${
            successful === 1 ? "voto submetido" : "votos submetidos"
          } com sucesso, mas ${rejections.length} falharam${suffix}`,
        });
      } else {
        setFeedback({
          type: "error",
          message: errorMessage ?? "Ocorreu um erro ao submeter os votos.",
        });
      }

      mutate();
    } catch {
      setFeedback({
        type: "error",
        message: "Ocorreu um erro inesperado ao submeter os votos.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setFeedback(null);
  };

  let buttonText = "Enviar votações";
  if (isSubmitting) {
    buttonText = "A enviar...";
  } else if (allVoted) {
    buttonText = "Votações Concluídas";
  }

  const buttonIcon = allVoted ? faCheckCircle : faPaperPlane;

  if (!token) {
    return (
      <div className="px-4 pb-24 pt-16 sm:px-8 sm:pt-20 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="max-w-md border border-light-gold/20 bg-black/25 p-8 backdrop-blur-lg flex flex-col items-center">
          <p className="font-gala text-[0.68rem] font-bold uppercase tracking-[0.35em] text-light-gold/60">
            Gala Awards
          </p>
          <h2 className="mt-3 font-gala text-2xl font-bold leading-tight text-white">
            Sessão Não Iniciada
          </h2>
          <p className="text-white/55 mt-4 mb-6 font-gala text-sm">
            Precisas de ter sessão iniciada na tua conta do NEI e uma inscrição válida na Gala para aceder a esta página.
          </p>
          <Button onClick={() => { window.location.href = loginLink; }} className="h-12 w-full flex items-center justify-center">
            Iniciar Sessão com conta NEI
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <section className="px-4 pb-28 pt-16 sm:px-8 sm:pt-20">
            <div className="mx-auto max-w-5xl text-center">
              <p className="font-gala text-[0.68rem] font-bold uppercase tracking-[0.35em] text-light-gold/60">
                Gala Awards
              </p>
              <h2 className="mt-3 font-gala text-[2.4rem] font-bold leading-tight text-white sm:text-[3.6rem]">
                Votações
              </h2>
              <p className="text-white/55 mx-auto mt-4 max-w-2xl font-gala text-sm sm:text-base">
                Escolhe quem mais se destacou em cada categoria.
              </p>
            </div>

            <div className="mx-auto mt-10 max-w-5xl">
              {state !== State.REGISTERED ? (
                <p className="text-white/45 border border-light-gold/20 bg-black/25 px-6 py-10 text-center font-gala text-sm">
                  Tens de estar inscrito na Gala para participar nas votações.
                </p>
              ) : sessionUser?.registration_active === false ? (
                <p className="text-white/45 border border-light-gold/20 bg-black/25 px-6 py-10 text-center font-gala text-sm">
                  A tua inscrição na Gala encontra-se cancelada ou inativa, pelo que não podes participar nas votações.
                </p>
              ) : votes.length === 0 ? (
                <p className="text-white/45 border border-light-gold/20 bg-black/25 px-6 py-10 text-center font-gala text-sm">
                  Não há categorias de votação abertas de momento.
                </p>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  {votes.map((vote: Vote) => (
                    <VoteCard key={vote._id} vote={vote} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {state === State.REGISTERED && sessionUser?.registration_active !== false && hasVotingCategories && (
            <div className="fixed bottom-0 left-0 z-30 w-full border-t border-light-gold/20 bg-black/80 px-4 py-4 backdrop-blur-lg sm:px-8">
              <div className="mx-auto flex max-w-5xl items-center gap-4">
                <p className="hidden flex-1 font-gala text-xs text-white/50 md:block">
                  {allVoted
                    ? "Já participaste em todas as categorias. Obrigado pela tua votação!"
                    : "Revê as tuas escolhas e confirma as votações."}
                </p>
                <Button
                  className={classNames(
                    "h-14 w-full text-lg md:w-auto md:min-w-[320px]",
                    allVoted
                      ? "cursor-not-allowed border border-neutral-700 !from-neutral-800 !to-neutral-700 !text-neutral-400 shadow-none hover:!saturate-100"
                      : "shadow-[0_0_20px_rgba(255,193,7,0.3)]",
                  )}
                  submit
                  disabled={isSubmitting || allVoted}
                >
                  {!isSubmitting && (
                    <FontAwesomeIcon icon={buttonIcon} className="mr-2" />
                  )}
                  {buttonText}
                </Button>
              </div>
            </div>
          )}
        </form>
      </FormProvider>

      {/* Submission Feedback Modal */}
      <AnimatePresence>
        {(isSubmitting || feedback) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={feedback ? closeModal : undefined}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl"
            >
              {feedback && (
                <button
                  type="button"
                  onClick={closeModal}
                  className="absolute right-4 top-4 text-neutral-400 transition-colors hover:text-white"
                >
                  <FontAwesomeIcon icon={faXmark} className="text-xl" />
                </button>
              )}

              <div className="flex flex-col items-center text-center">
                {isSubmitting && (
                  <>
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="mb-6 animate-spin text-5xl text-dark-gold"
                    />
                    <h3 className="mb-2 font-gala text-2xl font-semibold text-white">
                      A Votar...
                    </h3>
                    <p className="text-sm text-neutral-400">
                      Por favor aguarda um momento enquanto validamos e
                      guardamos as tuas escolhas.
                    </p>
                  </>
                )}
                {!isSubmitting && feedback?.type === "success" && (
                  <>
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
                      <FontAwesomeIcon
                        icon={faCheckCircle}
                        className="text-5xl text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]"
                      />
                    </div>
                    <h3 className="mb-2 font-gala text-2xl font-semibold text-white">
                      Sucesso!
                    </h3>
                    <p className="mb-6 text-sm text-neutral-300">
                      {feedback.message}
                    </p>
                    <Button
                      className="h-12 w-full"
                      onClick={closeModal}
                      submit={false}
                    >
                      Continuar
                    </Button>
                  </>
                )}
                {!isSubmitting && feedback?.type === "error" && (
                  <>
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
                      <FontAwesomeIcon
                        icon={faExclamationCircle}
                        className="text-5xl text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                      />
                    </div>
                    <h3 className="mb-2 font-gala text-2xl font-semibold text-white">
                      Incompleto
                    </h3>
                    <p className="mb-6 text-sm text-neutral-300">
                      {feedback.message}
                    </p>
                    <Button
                      onClick={closeModal}
                      className="h-12 w-full border border-neutral-600 !bg-transparent !from-transparent !to-transparent hover:!bg-neutral-800"
                      submit={false}
                    >
                      Voltar a tentar
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <VotingGuideModal isOpen={isGuideOpen} onClose={closeGuide} />
    </>
  );
}
