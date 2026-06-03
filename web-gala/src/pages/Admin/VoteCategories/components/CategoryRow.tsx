/* eslint-disable jsx-a11y/label-has-associated-control */
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faCloudUploadAlt,
  faEdit,
  faSave,
  faChevronDown,
  faChevronUp,
  faObjectGroup,
  faCheckDouble,
  faSpinner,
  faXmark,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons";
import GalaService, {
  type AdminVoteCategory,
  type AdminNominee,
} from "@/services/GalaService";
import { useAppToast } from "@/components/ui/Toast";
import ImageCropperModal from "@/components/Modals/ImageCropperModal";

const toIsoOrNull = (value: string) =>
  value ? new Date(value).toISOString() : null;

const isValidWindow = (start: string, end: string) => {
  if (!start && !end) return true;
  if (!start || !end) return false;
  return new Date(start) < new Date(end);
};

function NominationsPanel({
  categoryId,
  nominations,
  refresh,
}: Readonly<{
  categoryId: number;
  nominations: AdminNominee[];
  refresh: () => void;
}>) {
  const toast = useAppToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mergeTarget, setMergeTarget] = useState("");
  const [isMerging, setIsMerging] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isCreatingRunoff, setIsCreatingRunoff] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [runoffVotesStart, setRunoffVotesStart] = useState("");
  const [runoffVotesEnd, setRunoffVotesEnd] = useState("");

  const sorted = [...nominations].sort(
    (a, b) => b.votes.length - a.votes.length,
  );
  const cutoff = sorted[3]?.votes.length;
  const hasRunoffTie =
    sorted.length > 4 &&
    cutoff !== undefined &&
    sorted[4].votes.length === cutoff;
  const automaticFinalists = hasRunoffTie
    ? sorted.filter((nominee) => nominee.votes.length > cutoff)
    : [];
  const tiedNominees = hasRunoffTie
    ? sorted.filter((nominee) => nominee.votes.length === cutoff)
    : [];
  const runoffSlots = hasRunoffTie ? 4 - automaticFinalists.length : 0;
  const toggleSelect = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });

  const handleMerge = async () => {
    if (selected.size === 0) {
      toast.warning("Seleciona pelo menos um nome para fundir.");
      return;
    }
    const target = mergeTarget.trim() || [...selected][0];
    setIsMerging(true);
    try {
      await GalaService.admin.mergeNominees(categoryId, {
        target_name: target,
        source_names: [...selected].filter((n) => n !== target),
      });
      toast.success("Nomes fundidos com sucesso.");
      setSelected(new Set());
      setMergeTarget("");
      refresh();
    } catch {
      toast.error("Erro ao fundir nomes.");
    } finally {
      setIsMerging(false);
    }
  };

  const handleFinalize = async () => {
    setIsFinalizing(true);
    try {
      const selectedNames = selected.size > 0 ? [...selected] : undefined;
      await GalaService.admin.finalizeNominations(categoryId, selectedNames);
      toast.success(
        selectedNames
          ? "Nomeações finalizadas com a seleção indicada."
          : "Nomeações finalizadas. Top 4 definido como opções de votação.",
      );
      setConfirmFinalize(false);
      setSelected(new Set());
      refresh();
    } catch {
      toast.error("Erro ao finalizar nomeações.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleCreateRunoff = async () => {
    if (!isValidWindow(runoffVotesStart, runoffVotesEnd)) {
      toast.error("Define início e fim válidos para a 2.ª volta.");
      return;
    }
    setIsCreatingRunoff(true);
    try {
      await GalaService.admin.createRunoff(categoryId, {
        nominee_names: tiedNominees.map((nominee) => nominee.name),
        slots: runoffSlots,
        votes_start: toIsoOrNull(runoffVotesStart),
        votes_end: toIsoOrNull(runoffVotesEnd),
      });
      toast.success("2.ª volta criada com os nomeados empatados.");
      refresh();
    } catch {
      toast.error("Erro ao criar 2.ª volta.");
    } finally {
      setIsCreatingRunoff(false);
    }
  };

  if (nominations.length === 0) {
    return (
      <p className="py-2 text-center text-xs text-white/30">
        Ainda não há nomeações nesta categoria.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        {sorted.map((nominee) => (
          <label
            key={nominee.name}
            htmlFor={`nominee-${nominee.name}`}
            className="flex cursor-pointer items-center gap-3 px-2 py-1.5 transition hover:bg-white/5"
          >
            <input
              id={`nominee-${nominee.name}`}
              type="checkbox"
              checked={selected.has(nominee.name)}
              onChange={() => toggleSelect(nominee.name)}
              className="h-3.5 w-3.5 accent-dark-gold"
            />
            <span className="flex-1 text-sm text-white/80">{nominee.name}</span>
            <span className="text-white/35 text-xs">
              {nominee.votes.length} voto{nominee.votes.length === 1 ? "" : "s"}
            </span>
          </label>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 border border-light-gold/20 bg-black/20 p-3">
          <FontAwesomeIcon
            icon={faObjectGroup}
            className="shrink-0 text-xs text-dark-gold/60"
          />
          <input
            type="text"
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
            placeholder={`Nome final (padrão: "${[...selected][0]}")`}
            className="flex-1 rounded border border-light-gold/20 bg-transparent px-2 py-1 text-xs text-white placeholder-white/25 outline-none focus:border-dark-gold/50"
          />
          <button
            type="button"
            onClick={handleMerge}
            disabled={isMerging}
            className="flex items-center gap-1.5 rounded-full bg-dark-gold/20 px-3 py-1 text-xs font-semibold text-dark-gold transition hover:bg-dark-gold/30 disabled:opacity-50"
          >
            {isMerging ? (
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faObjectGroup} />
            )}
            Fundir {selected.size}
          </button>
        </div>
      )}

      <div className="border-t border-light-gold/20 pt-3">
        {hasRunoffTie && (
          <div className="mb-3 flex flex-col gap-2 border border-yellow-500/20 bg-yellow-500/5 p-3">
            <p className="text-xs text-yellow-100/70">
              Há {tiedNominees.length} nomeados empatados para {runoffSlots}{" "}
              lugar{runoffSlots === 1 ? "" : "es"} no Top 4.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/40">
                  Início da 2.ª volta
                </span>
                <input
                  type="datetime-local"
                  value={runoffVotesStart}
                  onChange={(e) => setRunoffVotesStart(e.target.value)}
                  className="rounded border border-yellow-500/20 bg-black/30 px-2 py-1 text-xs text-white outline-none [color-scheme:dark] focus:border-yellow-500/50"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/40">
                  Fim da 2.ª volta
                </span>
                <input
                  type="datetime-local"
                  value={runoffVotesEnd}
                  onChange={(e) => setRunoffVotesEnd(e.target.value)}
                  className="rounded border border-yellow-500/20 bg-black/30 px-2 py-1 text-xs text-white outline-none [color-scheme:dark] focus:border-yellow-500/50"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleCreateRunoff}
              disabled={isCreatingRunoff}
              className="w-fit rounded-full border border-yellow-500/30 px-4 py-1.5 text-xs font-semibold text-yellow-400/80 transition hover:border-yellow-500/60 hover:text-yellow-400 disabled:opacity-50"
            >
              {isCreatingRunoff
                ? "A criar..."
                : `Criar 2.ª volta entre ${tiedNominees.length}`}
            </button>
          </div>
        )}
        {confirmFinalize ? (
          <div className="flex items-center gap-3">
            <span className="flex-1 text-xs text-yellow-400/80">
              {selected.size > 0
                ? `Isto define os ${selected.size} nomes selecionados como opções de votação.`
                : "Isto define o Top 4 como opções de votação e fecha as nomeações."}{" "}
              Irreversível.
            </span>
            <button
              type="button"
              onClick={handleFinalize}
              disabled={isFinalizing}
              className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-400 hover:bg-yellow-500/30 disabled:opacity-50"
            >
              {isFinalizing ? "A finalizar..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmFinalize(false)}
              className="hover:bg-white/15 rounded-full bg-white/10 px-3 py-1 text-xs text-white/60"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmFinalize(true)}
            className="flex items-center gap-2 rounded-full border border-yellow-500/30 px-4 py-1.5 text-xs font-semibold text-yellow-400/80 transition hover:border-yellow-500/60 hover:text-yellow-400"
          >
            <FontAwesomeIcon icon={faCheckDouble} />
            {selected.size > 0
              ? `Finalizar com ${selected.size} selecionado${
                  selected.size === 1 ? "" : "s"
                }`
              : "Finalizar nomeações → Top 4"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CategoryRow({
  vote,
  refresh,
}: Readonly<{ vote: AdminVoteCategory; refresh: () => void }>) {
  const toast = useAppToast();
  const toLocalDatetimeString = (dateStr: string | undefined) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(vote.category);
  const [editDescription, setEditDescription] = useState(
    vote.description || "",
  );
  const [editMinNominees, setEditMinNominees] = useState(vote.min_nominees);
  const [editMaxNominees, setEditMaxNominees] = useState(vote.max_nominees);
  const [editOptions, setEditOptions] = useState<string[]>([...vote.options]);
  const [editRevealAt, setEditRevealAt] = useState(
    toLocalDatetimeString(vote.reveal_at),
  );
  const [editVotesStart, setEditVotesStart] = useState(
    toLocalDatetimeString(vote.votes_start || undefined),
  );
  const [editVotesEnd, setEditVotesEnd] = useState(
    toLocalDatetimeString(vote.votes_end || undefined),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [showNominations, setShowNominations] = useState(false);
  const [isCreatingVoteRunoff, setIsCreatingVoteRunoff] = useState(false);
  const [voteRunoffStart, setVoteRunoffStart] = useState("");
  const [voteRunoffEnd, setVoteRunoffEnd] = useState("");

  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState("");
  const [cropperFile, setCropperFile] = useState<File | null>(null);
  const [cropperOptionIndex, setCropperOptionIndex] = useState<number>(0);

  const voteScores = vote.options.map(
    (_, optionIndex) =>
      vote.votes.filter((castVote) => castVote.option === optionIndex).length,
  );
  const topVoteScore = voteScores.length > 0 ? Math.max(...voteScores) : 0;
  const tiedWinningIndexes = voteScores
    .map((score, index) => ({ score, index }))
    .filter(({ score }) => score === topVoteScore);
  const hasWinningVoteTie =
    vote.options.length > 1 &&
    topVoteScore > 0 &&
    tiedWinningIndexes.length > 1;

  const handleCreateVoteRunoff = async () => {
    if (!isValidWindow(voteRunoffStart, voteRunoffEnd)) {
      toast.error("Define início e fim válidos para o desempate.");
      return;
    }
    setIsCreatingVoteRunoff(true);
    try {
      await GalaService.admin.createVoteRunoff(vote._id, {
        votes_start: toIsoOrNull(voteRunoffStart),
        votes_end: toIsoOrNull(voteRunoffEnd),
      });
      toast.success("2.ª volta criada para desempatar o vencedor.");
      refresh();
    } catch {
      toast.error("Erro ao criar desempate da votação.");
    } finally {
      setIsCreatingVoteRunoff(false);
    }
  };

  const triggerCropper = (optionIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCropperImageSrc(reader.result as string);
      setCropperFile(file);
      setCropperOptionIndex(optionIndex);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const [isTogglingHidden, setIsTogglingHidden] = useState(false);

  const handleToggleVisibility = async () => {
    setIsTogglingHidden(true);
    try {
      await GalaService.vote.editVote(vote._id, {
        is_hidden: !vote.is_hidden,
      });
      toast.success(
        vote.is_hidden
          ? "Categoria agora visível (de acordo com o horário agendado)."
          : "Categoria ocultada com sucesso.",
      );
      refresh();
    } catch {
      toast.error("Erro ao alterar visibilidade da categoria.");
    } finally {
      setIsTogglingHidden(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await GalaService.vote.deleteCategory(vote._id);
      toast.success("A categoria foi removida com sucesso.");
      refresh();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })
        ?.response?.data?.detail;
      toast.error(
        typeof detail === "string" ? detail : "Erro ao apagar categoria.",
      );
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      toast.warning("O nome da categoria não pode estar vazio.");
      return;
    }
    if (editMinNominees > editMaxNominees) {
      toast.error("O mínimo de nomeados não pode ser superior ao máximo.");
      return;
    }
    if (editOptions.some((opt) => !opt.trim())) {
      toast.warning(
        "Todas as opções devem ter um nome preenchido ou ser removidas.",
      );
      return;
    }
    if (!isValidWindow(editVotesStart, editVotesEnd)) {
      toast.error("O início da votação deve ser anterior ao fim.");
      return;
    }

    setIsSaving(true);
    try {
      await GalaService.vote.editVote(vote._id, {
        category: editName.trim(),
        description: editDescription.trim() || undefined,
        min_nominees: editMinNominees,
        max_nominees: editMaxNominees,
        options: editOptions.map((o) => o.trim()),
        reveal_at: editRevealAt ? new Date(editRevealAt).toISOString() : null,
        votes_start: editVotesStart
          ? new Date(editVotesStart).toISOString()
          : null,
        votes_end: editVotesEnd ? new Date(editVotesEnd).toISOString() : null,
      });
      toast.success("Alterações guardadas com sucesso! ✨");
      setIsEditing(false);
      refresh();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })
        ?.response?.data?.detail;
      const msg =
        typeof detail === "string" ? detail : "Erro ao editar categoria.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (optionIndex: number, file: File) => {
    try {
      await GalaService.vote.uploadOptionPhoto(vote._id, optionIndex, file);
      toast.success(`Foto da opção ${optionIndex + 1} carregada!`);
      refresh();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })
        ?.response?.data?.detail;
      let msg =
        typeof detail === "string" ? detail : "Erro ao carregar imagem.";
      if (msg.includes("File too large"))
        msg = "A imagem é demasiado grande (máx. 5MB).";
      if (msg.includes("Invalid file type"))
        msg = "Formato de ficheiro inválido. Use JPG, PNG ou WebP.";
      toast.error(msg);
    }
  };

  const handleCroppedPhoto = async (croppedFile: File) => {
    setCropperOpen(false);
    await handlePhotoUpload(cropperOptionIndex, croppedFile);
  };

  const handlePhotoRemove = async (optionIndex: number) => {
    try {
      await GalaService.vote.deleteOptionPhoto(vote._id, optionIndex);
      toast.success("A foto foi removida.");
      refresh();
    } catch {
      toast.error("Erro ao remover imagem.");
    }
  };

  return (
    <div className="flex flex-col gap-4 border border-light-gold/20 bg-black/20 p-5">
      <div className="flex items-center justify-between gap-4 border-b border-light-gold/20 pb-3">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 border border-dark-gold/50 bg-black/40 px-3 py-1 font-gala text-xl font-semibold text-white outline-none"
          />
        ) : (
          <h3 className="flex-1 font-gala text-xl font-semibold leading-tight text-dark-gold">
            {vote.category}
          </h3>
        )}
        <div className="flex items-center gap-2">
          {isConfirmingDelete ? (
            <>
              <span className="mr-2 text-xs font-semibold text-red-400">
                Tem a certeza?
              </span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-500 hover:bg-red-500/40"
              >
                {isDeleting ? "A apagar..." : "Sim, apagar"}
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
                className="rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              {!isEditing && (
                <button
                  type="button"
                  onClick={handleToggleVisibility}
                  disabled={isTogglingHidden}
                  title={
                    vote.is_hidden
                      ? "Ativar categoria (mostrar de acordo com agendamento)"
                      : "Ocultar categoria manualmente"
                  }
                  className={[
                    "flex h-8 items-center gap-1.5 rounded-full border px-3 transition-all duration-300 disabled:opacity-50",
                    vote.is_hidden
                      ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      : "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20",
                  ].join(" ")}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      vote.is_hidden ? "bg-red-400" : "bg-green-400"
                    }`}
                  />
                  <span className="font-gala text-[0.68rem] font-bold uppercase tracking-wider">
                    {vote.is_hidden ? "Oculta" : "Visível"}
                  </span>
                </button>
              )}
              {isEditing ? (
                <button
                  type="button"
                  title="Guardar"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-green-400/10 text-green-400 transition hover:bg-green-400/20 disabled:opacity-50"
                >
                  <FontAwesomeIcon
                    icon={isSaving ? faSpinner : faSave}
                    className={isSaving ? "animate-spin" : ""}
                  />
                </button>
              ) : (
                <button
                  type="button"
                  title="Editar Categoria"
                  onClick={() => {
                    setEditName(vote.category);
                    setEditDescription(vote.description || "");
                    setEditMinNominees(vote.min_nominees);
                    setEditMaxNominees(vote.max_nominees);
                    setEditOptions([...vote.options]);
                    setEditRevealAt(toLocalDatetimeString(vote.reveal_at));
                    setEditVotesStart(
                      toLocalDatetimeString(vote.votes_start || undefined),
                    );
                    setEditVotesEnd(
                      toLocalDatetimeString(vote.votes_end || undefined),
                    );
                    setIsEditing(true);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
                >
                  <FontAwesomeIcon icon={faEdit} />
                </button>
              )}
              <button
                type="button"
                title="Apagar Categoria"
                onClick={() => setIsConfirmingDelete(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-red-400/60 transition hover:bg-red-500/20 hover:text-red-400"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isEditing ? (
          <div className="flex flex-col gap-3">
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Descrição da categoria..."
              rows={2}
              className="resize-none border border-dark-gold/30 bg-black/40 px-3 py-2 text-sm text-white/80 outline-none focus:border-dark-gold/60"
            />
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/40">
                  Mín. Nomeados
                </span>
                <input
                  type="number"
                  min={1}
                  value={editMinNominees}
                  onChange={(e) =>
                    setEditMinNominees(parseInt(e.target.value, 10) || 1)
                  }
                  className="rounded border border-dark-gold/30 bg-black/40 px-3 py-1 text-sm text-white outline-none focus:border-dark-gold/60"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/40">
                  Máx. Nomeados
                </span>
                <input
                  type="number"
                  min={1}
                  value={editMaxNominees}
                  onChange={(e) =>
                    setEditMaxNominees(parseInt(e.target.value, 10) || 1)
                  }
                  className="rounded border border-dark-gold/30 bg-black/40 px-3 py-1 text-sm text-white outline-none focus:border-dark-gold/60"
                />
              </label>
            </div>
            <div className="flex flex-col gap-1">
              <label className="flex flex-col gap-1">
                <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/40">
                  Agendar Revelação de Nomeados (Opcional)
                </span>
                <input
                  type="datetime-local"
                  value={editRevealAt}
                  onChange={(e) => setEditRevealAt(e.target.value)}
                  className="rounded border border-dark-gold/30 bg-black/40 px-3 py-1 text-sm text-white outline-none [color-scheme:dark] focus:border-dark-gold/60"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/40">
                  Início Votação
                </span>
                <input
                  type="datetime-local"
                  value={editVotesStart}
                  onChange={(e) => setEditVotesStart(e.target.value)}
                  className="rounded border border-dark-gold/30 bg-black/40 px-3 py-1 text-sm text-white outline-none [color-scheme:dark] focus:border-dark-gold/60"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/40">
                  Fim Votação
                </span>
                <input
                  type="datetime-local"
                  value={editVotesEnd}
                  onChange={(e) => setEditVotesEnd(e.target.value)}
                  className="rounded border border-dark-gold/30 bg-black/40 px-3 py-1 text-sm text-white outline-none [color-scheme:dark] focus:border-dark-gold/60"
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            {vote.description ? (
              <p className="text-sm italic text-white/40">{vote.description}</p>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-3">
              {vote.is_hidden && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  Ocultada Manualmente
                </span>
              )}
              {vote.reveal_at && !vote.is_hidden && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-blue-400">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      new Date(vote.reveal_at) <= new Date()
                        ? "bg-green-400"
                        : "animate-pulse bg-blue-400"
                    }`}
                  />
                  {new Date(vote.reveal_at) <= new Date()
                    ? "Revelada"
                    : `Revela a: ${new Date(vote.reveal_at).toLocaleString()}`}
                </span>
              )}
              <div className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-widest text-white/30">
                {vote.min_nominees === vote.max_nominees
                  ? `${vote.min_nominees} ${
                      vote.min_nominees === 1 ? "Nomeado" : "Nomeados"
                    }`
                  : `${vote.min_nominees}-${vote.max_nominees} Nomeados`}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {(isEditing ? editOptions : vote.options).map((option, i) => (
          <div
            key={`${vote._id}-option-${option}`}
            className="flex items-center gap-3 bg-black/10 p-2 text-sm text-white/80"
          >
            <div className="group relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-dark-gold/30">
              {vote.photo_paths[i] ? (
                <>
                  <img
                    src={vote.photo_paths[i]}
                    alt={option}
                    className="h-full w-full object-cover"
                  />
                  {!isEditing && (
                    <button
                      type="button"
                      className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100"
                      onClick={() => handlePhotoRemove(i)}
                      title="Remover foto"
                    >
                      <FontAwesomeIcon
                        icon={faTrash}
                        className="text-red-400"
                      />
                    </button>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/5 text-white/20">
                  <FontAwesomeIcon icon={faCloudUploadAlt} size="xs" />
                </div>
              )}
            </div>
            {isEditing ? (
              <input
                type="text"
                value={editOptions[i]}
                onChange={(e) => {
                  const newOpts = [...editOptions];
                  newOpts[i] = e.target.value;
                  setEditOptions(newOpts);
                }}
                className="flex-1 rounded border border-dark-gold/30 bg-black/40 px-3 py-2 text-white outline-none"
              />
            ) : (
              <span className="flex-1 font-medium">{option}</span>
            )}
            {!isEditing && (
              <label
                htmlFor={`photo-upload-${vote._id}-${i}`}
                title="Substituir foto"
                className="flex-shrink-0 cursor-pointer rounded-full border border-dark-gold/40 px-3 py-1 text-xs text-dark-gold/70 shadow-sm transition hover:border-dark-gold hover:text-dark-gold"
              >
                <FontAwesomeIcon icon={faCloudUploadAlt} className="mr-1" />
                Foto
                <input
                  id={`photo-upload-${vote._id}-${i}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      triggerCropper(i, file);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            )}
            {isEditing && (
              <button
                type="button"
                onClick={() =>
                  setEditOptions(editOptions.filter((_, idx) => idx !== i))
                }
                className="flex h-8 w-8 items-center justify-center rounded-full text-red-400/50 hover:bg-white/10 hover:text-red-400"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
          </div>
        ))}
        {isEditing && (
          <>
            <button
              type="button"
              onClick={() => setEditOptions([...editOptions, ""])}
              className="mt-2 flex items-center justify-center gap-2 rounded-full border border-dashed border-dark-gold/40 py-2 text-xs text-dark-gold/70 transition hover:border-dark-gold hover:text-dark-gold"
            >
              <FontAwesomeIcon icon={faPlus} />
              Nova Opção
            </button>
            <div className="flex justify-between px-2 text-xs italic text-white/40">
              <p>
                Ao editar opções, as fotos podem precisar de re-upload caso a
                ordem mude.
              </p>
            </div>
          </>
        )}
      </div>

      {!isEditing && hasWinningVoteTie && (
        <div className="flex flex-col gap-2 border border-yellow-500/20 bg-yellow-500/5 p-3">
          <div className="flex items-start gap-2">
            <FontAwesomeIcon
              icon={faTrophy}
              className="mt-0.5 text-xs text-yellow-400/80"
            />
            <p className="flex-1 text-xs text-yellow-100/70">
              Há {tiedWinningIndexes.length} opções empatadas em 1.º lugar com{" "}
              {topVoteScore} voto{topVoteScore === 1 ? "" : "s"}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tiedWinningIndexes.map(({ index }) => (
              <span
                key={`${vote._id}-vote-tie-${vote.options[index]}`}
                className="rounded-full bg-black/20 px-2.5 py-1 text-xs text-white/60"
              >
                {vote.options[index]}
              </span>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/40">
                Início do desempate
              </span>
              <input
                type="datetime-local"
                value={voteRunoffStart}
                onChange={(e) => setVoteRunoffStart(e.target.value)}
                className="rounded border border-yellow-500/20 bg-black/30 px-2 py-1 text-xs text-white outline-none [color-scheme:dark] focus:border-yellow-500/50"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/40">
                Fim do desempate
              </span>
              <input
                type="datetime-local"
                value={voteRunoffEnd}
                onChange={(e) => setVoteRunoffEnd(e.target.value)}
                className="rounded border border-yellow-500/20 bg-black/30 px-2 py-1 text-xs text-white outline-none [color-scheme:dark] focus:border-yellow-500/50"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleCreateVoteRunoff}
            disabled={isCreatingVoteRunoff}
            className="w-fit rounded-full border border-yellow-500/30 px-4 py-1.5 text-xs font-semibold text-yellow-400/80 transition hover:border-yellow-500/60 hover:text-yellow-400 disabled:opacity-50"
          >
            {isCreatingVoteRunoff
              ? "A criar..."
              : `Criar desempate entre ${tiedWinningIndexes.length}`}
          </button>
        </div>
      )}

      {!isEditing && (
        <div className="border-t border-light-gold/20 pt-3">
          <button
            type="button"
            onClick={() => setShowNominations((v) => !v)}
            className="flex w-full items-center justify-between text-xs text-white/40 transition hover:text-white/70"
          >
            <span>
              Nomeações{" "}
              <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 font-semibold">
                {vote.nominations.length}
              </span>
            </span>
            <FontAwesomeIcon
              icon={showNominations ? faChevronUp : faChevronDown}
              className="text-[0.6rem]"
            />
          </button>
          {showNominations && (
            <div className="mt-3">
              <NominationsPanel
                categoryId={vote._id}
                nominations={vote.nominations}
                refresh={refresh}
              />
            </div>
          )}
        </div>
      )}

      {cropperFile && (
        <ImageCropperModal
          isOpen={cropperOpen}
          imageSrc={cropperImageSrc}
          fileName={cropperFile.name}
          fileType={cropperFile.type}
          onCrop={handleCroppedPhoto}
          onClose={() => setCropperOpen(false)}
        />
      )}
    </div>
  );
}
