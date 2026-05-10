import { useState, useEffect, useRef } from "react";
import {
  faPlus,
  faCloudUploadAlt,
  faCheck,
  faSpinner,
  faXmark,
  faTrash,
  faEdit,
  faSave,
  faChevronDown,
  faChevronUp,
  faObjectGroup,
  faCheckDouble,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import GalaService, {
  AdminVoteCategory,
  AdminNominee,
  CategoryStatusUpdate,
} from "@/services/GalaService";
import { useAppToast } from "@/components/ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type OptionState = {
  id: string;
  name: string;
  photo?: File;
  previewUrl?: string;
};

type UploadStatus = "idle" | "uploading" | "success" | "error";

// ─── Sub-components ───────────────────────────────────────────────────────────

function OptionInput({
  option,
  index,
  onChange,
  onRemove,
  canRemove,
}: Readonly<{
  option: OptionState;
  index: number;
  onChange: (
    index: number,
    field: keyof OptionState,
    value: string | File,
  ) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}>) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange(index, "photo", file);
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <button
        type="button"
        title="Carregar foto"
        onClick={() => fileRef.current?.click()}
        className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-dark-gold/60 transition hover:border-dark-gold"
      >
        {option.previewUrl ? (
          <img
            src={option.previewUrl}
            alt={option.name || `Option ${index + 1}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <FontAwesomeIcon
            icon={faCloudUploadAlt}
            className="text-dark-gold/60"
          />
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
      </button>

      <input
        type="text"
        value={option.name}
        onChange={(e) => onChange(index, "name", e.target.value)}
        placeholder={`Nome da opção ${index + 1}`}
        className="flex-1 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-dark-gold/60"
      />

      <button
        type="button"
        disabled={!canRemove}
        onClick={() => onRemove(index)}
        title="Remover opção"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </div>
  );
}

// ─── Phase Toggle ─────────────────────────────────────────────────────────────

function PhaseToggle({
  label,
  active,
  onToggle,
  disabled,
}: Readonly<{
  label: string;
  active: boolean;
  onToggle: () => void;
  disabled: boolean;
}>) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={[
        "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-dark-gold/60 bg-dark-gold/15 text-dark-gold"
          : "border-white/15 bg-white/5 text-white/40 hover:border-white/30 hover:text-white/70",
      ].join(" ")}
    >
      <span
        className={[
          "h-2 w-2 rounded-full transition-colors",
          active ? "bg-dark-gold" : "bg-white/20",
        ].join(" ")}
      />
      {label}
    </button>
  );
}

// ─── Nominations Panel ────────────────────────────────────────────────────────

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
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  const sorted = [...nominations].sort((a, b) => b.votes.length - a.votes.length);

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

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
      await GalaService.admin.finalizeNominations(categoryId);
      toast.success("Nomeações finalizadas. Top 4 definido como opções de votação.");
      setConfirmFinalize(false);
      refresh();
    } catch {
      toast.error("Erro ao finalizar nomeações.");
    } finally {
      setIsFinalizing(false);
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
      {/* Nominees list */}
      <div className="flex flex-col gap-1">
        {sorted.map((nominee) => (
          <label
            key={nominee.name}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-white/5"
          >
            <input
              type="checkbox"
              checked={selected.has(nominee.name)}
              onChange={() => toggleSelect(nominee.name)}
              className="h-3.5 w-3.5 accent-dark-gold"
            />
            <span className="flex-1 text-sm text-white/80">{nominee.name}</span>
            <span className="text-xs text-white/35">
              {nominee.votes.length} voto{nominee.votes.length === 1 ? "" : "s"}
            </span>
          </label>
        ))}
      </div>

      {/* Merge controls */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
          <FontAwesomeIcon icon={faObjectGroup} className="shrink-0 text-xs text-dark-gold/60" />
          <input
            type="text"
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
            placeholder={`Nome final (padrão: "${[...selected][0]}")`}
            className="flex-1 rounded border border-white/10 bg-transparent px-2 py-1 text-xs text-white outline-none focus:border-dark-gold/50 placeholder-white/25"
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

      {/* Finalize button */}
      <div className="border-t border-white/10 pt-3">
        {confirmFinalize ? (
          <div className="flex items-center gap-3">
            <span className="flex-1 text-xs text-yellow-400/80">
              Isto define o Top 4 como opções de votação e fecha as nomeações. Irreversível.
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
              className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60 hover:bg-white/15"
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
            Finalizar nomeações → Top 4
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Create Category Form ────────────────────────────────────────────────────

function CreateCategoryForm({
  onSuccess,
}: Readonly<{ onSuccess: () => void }>) {
  const toast = useAppToast();
  const [categoryName, setCategoryName] = useState("");
  const [options, setOptions] = useState<OptionState[]>([
    { id: crypto.randomUUID(), name: "" },
    { id: crypto.randomUUID(), name: "" },
  ]);
  const [status, setStatus] = useState<UploadStatus>("idle");

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    return () => {
      optionsRef.current.forEach((opt) => {
        if (opt.previewUrl) URL.revokeObjectURL(opt.previewUrl);
      });
    };
  }, []);

  const handleOptionChange = (
    index: number,
    field: keyof OptionState,
    value: string | File,
  ) => {
    setOptions((prev) => {
      const updated = [...prev];
      if (field === "photo" && value instanceof File) {
        const { previewUrl } = updated[index];
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        updated[index] = {
          ...updated[index],
          photo: value,
          previewUrl: URL.createObjectURL(value),
        };
      } else if (field === "name" && typeof value === "string") {
        updated[index] = { ...updated[index], name: value };
      }
      return updated;
    });
  };

  const handleAddOption = () => {
    setOptions((prev) => [...prev, { id: crypto.randomUUID(), name: "" }]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions((prev) => {
      const { previewUrl } = prev[index];
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryName.trim()) {
      toast.error("Por favor, dê um nome à categoria.");
      return;
    }
    if (options.length < 2) {
      toast.warning("Cada categoria precisa de, pelo menos, 2 opções.");
      return;
    }
    for (const [i, opt] of options.entries()) {
      if (!opt.name.trim()) {
        toast.error(`A opção ${i + 1} precisa de um nome.`);
        return;
      }
    }

    setStatus("uploading");
    try {
      const newCategory = await GalaService.vote.createCategory({
        category: categoryName.trim(),
        options: options.map((o) => o.name.trim()),
        photo_paths: options.map(() => ""),
      });

      await Promise.all(
        options.map((opt, i) =>
          opt.photo
            ? GalaService.vote.uploadOptionPhoto(newCategory._id, i, opt.photo)
            : Promise.resolve(),
        ),
      );

      setStatus("success");
      toast.success("Categoria criada com sucesso! 🎉");
      setCategoryName("");
      setOptions([
        { id: crypto.randomUUID(), name: "" },
        { id: crypto.randomUUID(), name: "" },
      ]);
      onSuccess();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err: unknown) {
      setStatus("error");
      const detail = (err as { response?: { data?: { detail?: unknown } } })
        ?.response?.data?.detail;
      let errorMsg = "Erro ao criar categoria.";
      if (typeof detail === "string") errorMsg = detail;
      else if (Array.isArray(detail) && detail[0]?.msg) errorMsg = detail[0].msg;
      toast.error(errorMsg);
    }
  };

  const buttonText = (() => {
    if (status === "uploading") return "A criar...";
    if (status === "success") return "Criado!";
    return "Criar Categoria";
  })();

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-2xl border border-dark-gold/30 bg-black/30 p-6 backdrop-blur-md"
    >
      <h2 className="font-gala text-xl font-semibold text-dark-gold">
        Nova Categoria
      </h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="category-name" className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Nome da Categoria
          </span>
          <input
            id="category-name"
            type="text"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Ex: O mais simpático(a)"
            className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-dark-gold/60"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Opções (mín. 2)
        </span>
        {options.map((opt) => (
          <OptionInput
            key={opt.id}
            option={opt}
            index={options.indexOf(opt)}
            onChange={handleOptionChange}
            onRemove={handleRemoveOption}
            canRemove={options.length > 2}
          />
        ))}
        <button
          type="button"
          onClick={handleAddOption}
          className="mt-1 flex items-center gap-2 self-start rounded-full border border-dashed border-dark-gold/40 px-4 py-2 text-xs text-dark-gold/70 transition hover:border-dark-gold hover:text-dark-gold"
        >
          <FontAwesomeIcon icon={faPlus} />
          Adicionar opção
        </button>
      </div>

      <button
        type="submit"
        disabled={status === "uploading"}
        className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F7BBAC] to-[#C58676] px-6 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
      >
        {status === "uploading" && (
          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
        )}
        {status === "success" && <FontAwesomeIcon icon={faCheck} />}
        {buttonText}
      </button>
    </form>
  );
}

// ─── Existing Category Row ────────────────────────────────────────────────────

function CategoryRow({
  vote,
  refresh,
}: Readonly<{ vote: AdminVoteCategory; refresh: () => void }>) {
  const toast = useAppToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(vote.category);
  const [editOptions, setEditOptions] = useState<string[]>([...vote.options]);
  const [isSaving, setIsSaving] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const [togglingPhase, setTogglingPhase] = useState<string | null>(null);
  const [showNominations, setShowNominations] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await GalaService.vote.deleteCategory(vote._id);
      toast.success("A categoria foi removida com sucesso.");
      refresh();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })
        ?.response?.data?.detail;
      const msg =
        typeof detail === "string" ? detail : "Erro ao apagar categoria.";
      toast.error(msg);
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      toast.warning("O nome da categoria não pode estar vazio.");
      return;
    }
    if (editOptions.length < 2) {
      toast.warning("São necessárias pelo menos 2 opções.");
      return;
    }
    if (editOptions.some((opt) => !opt.trim())) {
      toast.warning("Todas as opções devem ter um nome preenchido.");
      return;
    }

    setIsSaving(true);
    try {
      await GalaService.vote.editVote(vote._id, {
        category: editName.trim(),
        options: editOptions.map((o) => o.trim()),
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

  const handlePhotoRemove = async (optionIndex: number) => {
    try {
      await GalaService.vote.deleteOptionPhoto(vote._id, optionIndex);
      toast.success("A foto foi removida.");
      refresh();
    } catch {
      toast.error("Erro ao remover imagem.");
    }
  };

  const handlePhaseToggle = async (update: CategoryStatusUpdate) => {
    const key = Object.keys(update)[0];
    setTogglingPhase(key);
    try {
      await GalaService.admin.updateCategoryStatus(vote._id, update);
      refresh();
    } catch {
      toast.error("Erro ao atualizar fase.");
    } finally {
      setTogglingPhase(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 rounded-lg border border-dark-gold/50 bg-black/40 px-3 py-1 font-gala text-xl font-semibold text-white outline-none"
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
                  onClick={() => setIsEditing(true)}
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

      {/* Phase controls */}
      <div className="flex flex-wrap gap-2">
        <PhaseToggle
          label="Nomeações"
          active={vote.nomination_open}
          disabled={togglingPhase === "nomination_open"}
          onToggle={() =>
            handlePhaseToggle({ nomination_open: !vote.nomination_open })
          }
        />
        <PhaseToggle
          label="Votação"
          active={vote.voting_open}
          disabled={togglingPhase === "voting_open"}
          onToggle={() => handlePhaseToggle({ voting_open: !vote.voting_open })}
        />
        <PhaseToggle
          label="Resultados"
          active={vote.results_visible}
          disabled={togglingPhase === "results_visible"}
          onToggle={() =>
            handlePhaseToggle({ results_visible: !vote.results_visible })
          }
        />
      </div>

      {/* Options list */}
      <div className="flex flex-col gap-3">
        {(isEditing ? editOptions : vote.options).map((option, i) => (
          <div
            key={`${vote._id}-option-${option}`}
            className="flex items-center gap-3 rounded-xl bg-black/10 p-2 text-sm text-white/80"
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
                    if (file) handlePhotoUpload(i, file);
                  }}
                />
              </label>
            )}

            {isEditing && (
              <button
                type="button"
                disabled={editOptions.length <= 2}
                onClick={() => {
                  setEditOptions(editOptions.filter((_, idx) => idx !== i));
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-red-400/50 hover:bg-white/10 hover:text-red-400 disabled:opacity-20"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
          </div>
        ))}

        {isEditing && (
          <button
            type="button"
            onClick={() => setEditOptions([...editOptions, ""])}
            className="mt-2 flex items-center justify-center gap-2 rounded-full border border-dashed border-dark-gold/40 py-2 text-xs text-dark-gold/70 transition hover:border-dark-gold hover:text-dark-gold"
          >
            <FontAwesomeIcon icon={faPlus} />
            Nova Opção
          </button>
        )}

        {isEditing && (
          <div className="flex justify-between px-2 text-xs italic text-white/40">
            <p>
              Ao editar opções, as fotos podem precisar de re-upload caso a ordem
              mude.
            </p>
          </div>
        )}
      </div>

      {/* Nominations section */}
      {!isEditing && (
        <div className="border-t border-white/10 pt-3">
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
    </div>
  );
}

// ─── Main VoteCategories Component ───────────────────────────────────────────

export default function VoteCategories() {
  const [categories, setCategories] = useState<AdminVoteCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useAppToast();

  const refresh = () => {
    setLoading(true);
    GalaService.admin
      .listVotingCategories()
      .then((data) => setCategories(data))
      .catch(() => toast.error("Erro ao carregar categorias."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <CreateCategoryForm onSuccess={refresh} />

      <div className="flex flex-col gap-4">
        <h2 className="border-b border-dark-gold/20 pb-2 font-gala text-2xl font-semibold text-white/90">
          Categorias Existentes
        </h2>
        {(() => {
          if (loading) {
            return (
              <div className="flex items-center gap-3 p-4 text-white/50">
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="animate-spin text-dark-gold"
                />
                A carregar categorias...
              </div>
            );
          }
          if (categories.length === 0) {
            return (
              <p className="rounded-xl border border-white/5 bg-black/20 p-4 text-center text-sm text-white/40">
                Ainda não há categorias criadas.
              </p>
            );
          }
          return (
            <div className="grid gap-6">
              {categories.map((vote) => (
                <CategoryRow key={vote._id} vote={vote} refresh={refresh} />
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
