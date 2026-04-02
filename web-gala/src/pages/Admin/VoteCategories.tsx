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
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import GalaService from "@/services/GalaService";
import { useAppToast } from "@/components/ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type OptionState = {
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
}: {
  option: OptionState;
  index: number;
  onChange: (
    index: number,
    field: keyof OptionState,
    value: string | File,
  ) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange(index, "photo", file);
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      {/* Photo preview / upload trigger */}
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

      {/* Name input */}
      <input
        type="text"
        value={option.name}
        onChange={(e) => onChange(index, "name", e.target.value)}
        placeholder={`Nome da opção ${index + 1}`}
        className="flex-1 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-dark-gold/60"
      />

      {/* Remove button */}
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

// ─── Create Category Form ────────────────────────────────────────────────────

function CreateCategoryForm({ onSuccess }: { onSuccess: () => void }) {
  const toast = useAppToast();
  const [categoryName, setCategoryName] = useState("");
  const [options, setOptions] = useState<OptionState[]>([
    { name: "" },
    { name: "" },
  ]);
  const [status, setStatus] = useState<UploadStatus>("idle");

  const handleOptionChange = (
    index: number,
    field: keyof OptionState,
    value: string | File,
  ) => {
    setOptions((prev) => {
      const updated = [...prev];
      if (field === "photo" && value instanceof File) {
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
    setOptions((prev) => [...prev, { name: "" }]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
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

      // Upload photos for each option that has one
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (opt.photo) {
          await GalaService.vote.uploadOptionPhoto(
            newCategory._id,
            i,
            opt.photo,
          );
        }
      }

      setStatus("success");
      toast.success("Categoria criada com sucesso! 🎉");
      setCategoryName("");
      setOptions([{ name: "" }, { name: "" }]);
      onSuccess();

      setTimeout(() => setStatus("idle"), 2000);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      
      let errorMsg = "Erro ao criar categoria.";
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        errorMsg = typeof detail === "string" ? detail : (detail[0]?.msg || JSON.stringify(detail));
      }
      
      toast.error(errorMsg);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-2xl border border-dark-gold/30 bg-black/30 p-6 backdrop-blur-md"
    >
      <h2 className="font-gala text-xl font-semibold text-dark-gold">
        Nova Categoria
      </h2>

      {/* Category name */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Nome da Categoria
        </label>
        <input
          type="text"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="Ex: O mais simpático(a)"
          className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-dark-gold/60"
        />
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Opções (mín. 2)
        </label>
        {options.map((opt, i) => (
          <OptionInput
            key={i}
            option={opt}
            index={i}
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

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "uploading"}
        className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F7BBAC] to-[#C58676] px-6 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
      >
        {status === "uploading" && (
          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
        )}
        {status === "success" && <FontAwesomeIcon icon={faCheck} />}
        {status === "uploading"
          ? "A criar..."
          : status === "success"
          ? "Criado!"
          : "Criar Categoria"}
      </button>
    </form>
  );
}

// ─── Existing Category Row ────────────────────────────────────────────────────

function CategoryRow({ vote, refresh }: { vote: Vote; refresh: () => void }) {
  const toast = useAppToast();

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(vote.category);
  const [editOptions, setEditOptions] = useState<string[]>([...vote.options]);
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await GalaService.vote.deleteCategory(vote._id);
      toast.success("A categoria foi removida com sucesso.");
      refresh();
    } catch (err: any) {
      console.error(err);
      
      let errorMsg = "Erro ao apagar categoria.";
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        errorMsg = typeof detail === "string" ? detail : (detail[0]?.msg || JSON.stringify(detail));
      }

      toast.error(errorMsg);
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
    } catch (err: any) {
      console.error(err);

      let errorMsg = "Erro ao editar categoria.";
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        errorMsg = typeof detail === "string" ? detail : (detail[0]?.msg || JSON.stringify(detail));
      }

      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (optionIndex: number, file: File) => {
    try {
      await GalaService.vote.uploadOptionPhoto(vote._id, optionIndex, file);
      toast.success(`Foto da opção ${optionIndex + 1} carregada!`);
      refresh();
    } catch (err: any) {
      console.error(err);

      let errorMsg = "Erro ao carregar imagem.";
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        errorMsg = typeof detail === "string" ? detail : (detail[0]?.msg || JSON.stringify(detail));
        
        // Translate some common errors for better UX
        if (errorMsg.includes("File too large")) errorMsg = "A imagem é demasiado grande (máx. 5MB).";
        if (errorMsg.includes("Invalid file type")) errorMsg = "Formato de ficheiro inválido. Use JPG, PNG ou WebP.";
      }

      toast.error(errorMsg);
    }
  };

  const handlePhotoRemove = async (optionIndex: number) => {
    try {
      await GalaService.vote.deleteOptionPhoto(vote._id, optionIndex);
      toast.success("A foto foi removida.");
      refresh();
    } catch (err: any) {
      console.error(err);
      
      let errorMsg = "Erro ao remover imagem.";
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        errorMsg = typeof detail === "string" ? detail : (detail[0]?.msg || JSON.stringify(detail));
      }

      toast.error(errorMsg);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-5">
      {/* Header: Name and Actions */}
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
          {/* Delete Actions */}
          {isConfirmingDelete ? (
            <>
              <span className="mr-2 text-xs font-semibold text-red-400">
                Tem a certeza?
              </span>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-500 hover:bg-red-500/40"
              >
                {isDeleting ? "A apagar..." : "Sim, apagar"}
              </button>
              <button
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
                className="rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              {/* Edit Action */}
              {isEditing ? (
                <button
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
                  title="Editar Categoria"
                  onClick={() => setIsEditing(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
                >
                  <FontAwesomeIcon icon={faEdit} />
                </button>
              )}

              {/* Trash Action */}
              <button
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

      {/* Options List */}
      <div className="flex flex-col gap-3">
        {(isEditing ? editOptions : vote.options).map((option, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl bg-black/10 p-2 text-sm text-white/80"
          >
            {/* Current photo preview (not editable directly in edit mode string array, but stays visible) */}
            <div className="group relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-dark-gold/30">
              {vote.photo_paths[i] ? (
                <>
                  <img
                    src={vote.photo_paths[i]}
                    alt={option}
                    className="h-full w-full object-cover"
                  />
                  {!isEditing && (
                    <div
                      className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100"
                      onClick={() => handlePhotoRemove(i)}
                      title="Remover foto"
                    >
                      <FontAwesomeIcon
                        icon={faTrash}
                        className="text-red-400"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/5 text-white/20">
                  <FontAwesomeIcon icon={faCloudUploadAlt} size="xs" />
                </div>
              )}
            </div>

            {/* Option Name */}
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

            {/* Upload photo button (hidden in edit mode to avoid confusion) */}
            {!isEditing && (
              <label
                title="Substituir foto"
                className="flex-shrink-0 cursor-pointer rounded-full border border-dark-gold/40 px-3 py-1 text-xs text-dark-gold/70 shadow-sm transition hover:border-dark-gold hover:text-dark-gold"
              >
                <FontAwesomeIcon icon={faCloudUploadAlt} className="mr-1" />
                Foto
                <input
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

            {/* Remove Option Button (only in edit mode) */}
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
      </div>

      {/* Action text block */}
      {isEditing && (
        <div className="flex justify-between px-2 text-xs italic text-white/40">
          <p>
            Ao editar opções, as fotos podem precisar de re-upload caso a ordem
            mude.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main VoteCategories Component ───────────────────────────────────────────

export default function VoteCategories() {
  const [categories, setCategories] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    GalaService.vote
      .listCategories()
      .then((data) => setCategories(data))
      .catch(console.error)
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
        {loading ? (
          <div className="flex items-center gap-3 p-4 text-white/50">
            <FontAwesomeIcon
              icon={faSpinner}
              className="animate-spin text-dark-gold"
            />
            A carregar categorias...
          </div>
        ) : categories.length === 0 ? (
          <p className="rounded-xl border border-white/5 bg-black/20 p-4 text-center text-sm text-white/40">
            Ainda não há categorias criadas.
          </p>
        ) : (
          <div className="grid gap-6">
            {categories.map((vote) => (
              <CategoryRow key={vote._id} vote={vote} refresh={refresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
