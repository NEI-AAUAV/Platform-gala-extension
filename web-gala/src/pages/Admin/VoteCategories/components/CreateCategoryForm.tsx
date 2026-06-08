/* eslint-disable jsx-a11y/label-has-associated-control */
import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faCloudUploadAlt,
  faCheck,
  faSpinner,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import GalaService from "@/services/GalaService";
import { useAppToast } from "@/components/ui/Toast";
import ImageCropperModal from "@/components/Modals/ImageCropperModal";

type OptionState = {
  id: string;
  name: string;
  photo?: File;
  previewUrl?: string;
};

type UploadStatus = "idle" | "uploading" | "success" | "error";

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
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState("");
  const [cropperFile, setCropperFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImageSrc(
        typeof reader.result === "string" ? reader.result : "",
      );
      setCropperFile(file);
      setCropperOpen(true);
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedPhoto = (croppedFile: File) => {
    setCropperOpen(false);
    onChange(index, "photo", croppedFile);
  };

  return (
    <div className="flex items-center gap-3 border border-light-gold/20 bg-black/20 p-3">
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
        className="flex-1 border border-light-gold/20 bg-transparent px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-dark-gold/60"
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

export default function CreateCategoryForm({
  onSuccess,
}: Readonly<{ onSuccess: () => void }>) {
  const toast = useAppToast();
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [minNominees, setMinNominees] = useState(1);
  const [maxNominees, setMaxNominees] = useState(1);
  const [options, setOptions] = useState<OptionState[]>([]);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [revealAt, setRevealAt] = useState("");

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
    if (minNominees > maxNominees) {
      toast.error("O mínimo de nomeados não pode ser superior ao máximo.");
      return;
    }

    const filteredOptions = options.filter((o) => o.name.trim() !== "");
    setStatus("uploading");
    try {
      const newCategory = await GalaService.vote.createCategory({
        category: categoryName.trim(),
        description: categoryDescription.trim() || undefined,
        min_nominees: minNominees,
        max_nominees: maxNominees,
        options: filteredOptions.map((o) => o.name.trim()),
        photo_paths: filteredOptions.map(() => ""),
        reveal_at: revealAt ? new Date(revealAt).toISOString() : undefined,
      });

      await Promise.all(
        filteredOptions.map((opt, i) =>
          opt.photo
            ? GalaService.vote.uploadOptionPhoto(newCategory._id, i, opt.photo)
            : Promise.resolve(),
        ),
      );

      setStatus("success");
      toast.success("Categoria criada com sucesso!");
      setCategoryName("");
      setCategoryDescription("");
      setMinNominees(1);
      setMaxNominees(1);
      setRevealAt("");
      setOptions([]);
      onSuccess();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err: unknown) {
      setStatus("error");
      const detail = (err as { response?: { data?: { detail?: unknown } } })
        ?.response?.data?.detail;
      let errorMsg = "Erro ao criar categoria.";
      if (typeof detail === "string") errorMsg = detail;
      else if (Array.isArray(detail) && detail[0]?.msg)
        errorMsg = detail[0].msg;
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
      className="flex flex-col gap-5 border border-dark-gold/30 bg-black/30 p-6 backdrop-blur-md"
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
            className="rounded-lg border border-light-gold/20 bg-transparent px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-dark-gold/60"
          />
        </label>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="category-description" className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Descrição da Categoria (Opcional)
          </span>
          <textarea
            id="category-description"
            value={categoryDescription}
            onChange={(e) => setCategoryDescription(e.target.value)}
            placeholder="Ex: Aquele que está sempre a sorrir para todos..."
            rows={2}
            className="resize-none rounded-lg border border-light-gold/20 bg-transparent px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-dark-gold/60"
          />
        </label>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="category-reveal" className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Agendar Revelação de Nomeados (Opcional)
          </span>
          <input
            id="category-reveal"
            type="datetime-local"
            value={revealAt}
            onChange={(e) => setRevealAt(e.target.value)}
            className="rounded-lg border border-light-gold/20 bg-transparent px-4 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-dark-gold/60"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Min. Nomeados
          </span>
          <input
            type="number"
            min={1}
            value={minNominees}
            onChange={(e) =>
              setMinNominees(Number.parseInt(e.target.value, 10) || 1)
            }
            className="rounded-lg border border-light-gold/20 bg-transparent px-4 py-2 text-sm text-white outline-none focus:border-dark-gold/60"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Max. Nomeados
          </span>
          <input
            type="number"
            min={1}
            value={maxNominees}
            onChange={(e) =>
              setMaxNominees(Number.parseInt(e.target.value, 10) || 1)
            }
            className="rounded-lg border border-light-gold/20 bg-transparent px-4 py-2 text-sm text-white outline-none focus:border-dark-gold/60"
          />
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Opções de Votação (Opcional, para fluxo com nomeações pré-definidas)
        </span>
        {options.map((opt, index) => (
          <OptionInput
            key={opt.id}
            option={opt}
            index={index}
            onChange={handleOptionChange}
            onRemove={handleRemoveOption}
            canRemove
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
        className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#c9a843] to-[#8a6a20] px-6 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
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
