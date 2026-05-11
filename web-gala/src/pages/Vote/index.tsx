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
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import VoteCard from "@/components/VoteCard";
import useVotes from "@/hooks/voteHooks/useVotes";
import postVoteCast from "@/hooks/voteHooks/useVoteCast";
import useSessionUser, { State } from "@/hooks/userHooks/useSessionUser";

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
    const r = reason as { response?: { status?: number; data?: { detail?: string } } };
    const status = r.response?.status;
    if (status === 403) return "A votação ainda não está aberta para esta categoria.";
    if (status === 409) return "Já votaste nesta categoria.";
    const detail = r.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return "Erro desconhecido. Tenta novamente.";
}

export default function Vote() {
  const { state } = useSessionUser();
  const { votes: allVotes, mutate } = useVotes();
  const votes = allVotes.filter((v: Vote) => v.voting_open && v.options.length > 0);
  const hasVotingCategories = votes.length > 0;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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
  }, [votes, methods]);

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

      const errorMessage = rejections.length > 0
        ? resolveVoteError(rejections[0].reason)
        : null;

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

  return (
    <>
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <h2 className="pt-20 text-center text-[3rem] font-bold sm:text-[4rem]">
            <span className="block font-gala text-light-gold">Votações</span>
          </h2>

          <div className="mx-4 mt-10 grid gap-8">
            {votes?.map((vote) => (
              <VoteCard key={vote._id} vote={vote} />
            ))}
          </div>
          {state === State.REGISTERED && hasVotingCategories && (
            <div className="sticky bottom-0 z-10 mx-auto mt-5 max-w-md justify-center px-4 pb-10 pt-5 font-gala">
              <Button
                className={classNames(
                  "h-14 w-full text-lg shadow-[0_0_20px_rgba(255,193,7,0.3)]",
                )}
                submit
                disabled={isSubmitting}
              >
                {!isSubmitting && <FontAwesomeIcon icon={faPaperPlane} />}
                {isSubmitting ? "A enviar..." : "Enviar votações"}
              </Button>
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
    </>
  );
}
