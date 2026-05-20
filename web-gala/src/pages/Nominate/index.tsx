import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import VoteCard from "@/components/VoteCard";
import useVotes from "@/hooks/voteHooks/useVotes";
import useSessionUser, { State } from "@/hooks/userHooks/useSessionUser";
import GalaService from "@/services/GalaService";
import { useAppToast } from "@/components/ui/Toast";
import NominationGuideModal from "@/components/Modals/NominationGuideModal";

const storageKey = (categoryId: number) => `gala_nomination_${categoryId}`;
const guideSeenKey = "gala_nomination_guide_seen";

function NominateContent({
  categories,
  isRegistered,
  nominations,
  setNames,
  errors,
  submittedNames,
  onStartEditing,
  forceEdit,
}: Readonly<{
  categories: Vote[];
  isRegistered: boolean;
  nominations: Record<number, string[]>;
  setNames: (catId: number, names: string[]) => void;
  errors: Record<number, string | null>;
  submittedNames: Record<number, string | null>;
  onStartEditing: (catId: number) => void;
  forceEdit: Record<number, boolean>;
}>) {
  if (!isRegistered) {
    return (
      <p className="col-span-full border border-light-gold/20 bg-black/25 px-6 py-10 text-center font-gala text-sm text-white/50">
        Tens de estar inscrito no Gala para participar nas nomeações.
      </p>
    );
  }
  if (categories.length === 0) {
    return (
      <p className="col-span-full border border-light-gold/20 bg-black/25 px-6 py-10 text-center font-gala text-sm text-white/50">
        Não há categorias de nomeação abertas.
      </p>
    );
  }
  return (
    <>
      {categories.map((vote) => (
        <VoteCard
          key={vote._id}
          vote={vote}
          nominationNames={nominations[vote._id] || []}
          onNominationNamesChange={(names) => setNames(vote._id, names)}
          error={errors[vote._id]}
          submittedName={submittedNames[vote._id]}
          onStartEditing={() => onStartEditing(vote._id)}
          isEditing={forceEdit[vote._id]}
        />
      ))}
    </>
  );
}

export default function Nominate() {
  const toast = useAppToast();
  const { state } = useSessionUser();
  const { votes, mutate } = useVotes();
  const nominationCategories = votes.filter((v) => v.nomination_open);

  const [nominations, setNominations] = useState<Record<number, string[]>>({});
  const [errors, setErrors] = useState<Record<number, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedNames, setSubmittedNames] = useState<
    Record<number, string | null>
  >({});
  const [forceEdit, setForceEdit] = useState<Record<number, boolean>>({});
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem(guideSeenKey);
    if (!hasSeenGuide) {
      setIsGuideOpen(true);
    }
  }, []);

  const closeGuide = () => {
    setIsGuideOpen(false);
    localStorage.setItem(guideSeenKey, "true");
  };

  useEffect(() => {
    const initialNominations: Record<number, string[]> = {};
    const initialSubmittedNames: Record<number, string | null> = {};

    nominationCategories.forEach((cat) => {
      const stored = localStorage.getItem(storageKey(cat._id));
      if (stored) {
        initialSubmittedNames[cat._id] = stored;
        // If already nominated, we don't necessarily want to load them into the "draft"
        // unless we want to allow editing easily.
        // For now, let's load them so they are visible/editable if the user wants.
        initialNominations[cat._id] = stored.split(" & ");
      } else {
        initialNominations[cat._id] = [];
      }
    });

    setNominations(initialNominations);
    setSubmittedNames(initialSubmittedNames);
  }, [votes]); // Re-run when votes change (e.g. after refetch)

  const setNames = (catId: number, names: string[]) => {
    setNominations((prev) => ({ ...prev, [catId]: names }));
    setErrors((prev) => ({ ...prev, [catId]: null }));
  };

  const onStartEditing = (catId: number) => {
    setForceEdit((prev) => ({ ...prev, [catId]: true }));
  };

  const handleSubmitAll = async () => {
    const itemsToSubmit = nominationCategories
      .filter((cat) => {
        // Only submit if it's not already nominated OR if the user is force-editing
        // AND if there are names to submit
        const names = nominations[cat._id] || [];
        return (
          (!cat.already_nominated || forceEdit[cat._id]) && names.length > 0
        );
      })
      .map((cat) => ({
        category_id: cat._id,
        names: nominations[cat._id],
      }));

    if (itemsToSubmit.length === 0) {
      toast.error("Não tens novas nomeações para submeter.");
      return;
    }

    // Validation
    const newErrors: Record<number, string | null> = {};
    let hasErrors = false;
    itemsToSubmit.forEach((item) => {
      const cat = nominationCategories.find((c) => c._id === item.category_id)!;
      if (item.names.length < cat.min_nominees) {
        newErrors[item.category_id] = `Precisas de adicionar pelo menos ${
          cat.min_nominees
        } ${cat.min_nominees === 1 ? "nome" : "nomes"}.`;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(newErrors);
      toast.error("Algumas nomeações não cumprem os requisitos mínimos.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await GalaService.vote.bulkNominate(itemsToSubmit);

      if (result.status === "success" || result.status === "partial_success") {
        // Update localStorage for successful ones
        const successfulCatIds = itemsToSubmit
          .filter(
            (item) =>
              !result.errors?.some((e) => e.category_id === item.category_id),
          )
          .map((item) => item.category_id);

        successfulCatIds.forEach((id) => {
          const finalName = [...nominations[id]]
            .sort((a, b) => a.localeCompare(b))
            .join(" & ");
          localStorage.setItem(storageKey(id), finalName);
          setForceEdit((prev) => ({ ...prev, [id]: false }));
        });

        if (result.status === "success") {
          toast.success("Todas as nomeações foram submetidas com sucesso!");
        } else {
          toast.error("Algumas nomeações falharam. Verifica os erros abaixo.");
          const backendErrors: Record<number, string | null> = {};
          result.errors?.forEach((e) => {
            backendErrors[e.category_id] = e.error;
          });
          setErrors((prev) => ({ ...prev, ...backendErrors }));
        }
        mutate();
      }
    } catch (e) {
      toast.error("Erro ao submeter nomeações. Tenta novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const hasChanges = nominationCategories.some(
    (cat) =>
      (!cat.already_nominated || forceEdit[cat._id]) &&
      (nominations[cat._id]?.length ?? 0) > 0,
  );

  return (
    <div className="px-4 pb-24 pt-16 sm:px-8 sm:pt-20">
      <div className="mx-auto max-w-5xl text-center">
        <p className="font-gala text-[0.68rem] font-bold uppercase tracking-[0.35em] text-light-gold/60">
          Gala Awards
        </p>
        <h2 className="mt-3 font-gala text-[2.4rem] font-bold leading-tight text-white sm:text-[3.6rem]">
          Nomeações
        </h2>
        <p className="text-white/55 mx-auto mt-4 max-w-2xl font-gala text-sm sm:text-base">
          Indica colegas para cada categoria usando primeiro e ultimo nome.
          Podes preencher varias categorias e submeter tudo no final.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl gap-6 sm:mt-12 lg:grid-cols-2">
        <NominateContent
          categories={nominationCategories}
          isRegistered={state === State.REGISTERED}
          nominations={nominations}
          setNames={setNames}
          errors={errors}
          submittedNames={submittedNames}
          onStartEditing={onStartEditing}
          forceEdit={forceEdit}
        />
      </div>

      {state === State.REGISTERED && nominationCategories.length > 0 && (
        <div className="fixed bottom-0 left-0 z-30 w-full border-t border-white/10 bg-black/80 px-4 py-4 backdrop-blur-lg">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="font-gala text-xs text-white/40">
                {hasChanges
                  ? "Tens nomeações pendentes para submeter."
                  : "Preenche as categorias acima."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSubmitAll}
              disabled={submitting || !hasChanges}
              className="to-dark-gold/15 flex w-full items-center justify-center gap-3 border border-light-gold/50 bg-gradient-to-r from-light-gold/20 py-3.5 font-gala text-sm font-bold text-light-gold transition-all hover:border-light-gold hover:from-light-gold/30 hover:to-dark-gold/25 disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto sm:px-12"
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon
                    icon={faCircleNotch}
                    className="animate-spin"
                  />
                  A submeter...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} />
                  Submeter Todas as Nomeações
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <NominationGuideModal isOpen={isGuideOpen} onClose={closeGuide} />
    </div>
  );
}
