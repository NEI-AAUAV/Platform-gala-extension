import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faCircleNotch,
  faPencil,
  faPlus,
  faSearch,
  faUserCheck,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import GalaService from "@/services/GalaService";

interface Props {
  readonly categoryId: number;
  readonly alreadyNominated: boolean;
  readonly minNominees: number;
  readonly maxNominees: number;
  readonly names: string[];
  readonly onNamesChange: (names: string[]) => void;
  readonly error?: string | null;
  readonly submittedName?: string | null;
  readonly onStartEditing?: () => void;
}

export default function NominationInput({
  categoryId,
  alreadyNominated,
  minNominees,
  maxNominees,
  names,
  onNamesChange,
  error,
  submittedName,
  onStartEditing,
}: Props) {
  const [value, setValue] = useState("");

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      setActiveSuggestionIdx(-1);
      setIsLoadingSuggestions(false);
      return undefined;
    }
    debounceRef.current = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const results = await GalaService.vote.getSuggestions(
          categoryId,
          value,
        );
        // Filter out names already in the list
        setSuggestions(results.filter((r) => !names.includes(r)));
        setIsDropdownOpen(true);
        setActiveSuggestionIdx(-1);
      } catch {
        setSuggestions([]);
        setIsDropdownOpen(true);
        setActiveSuggestionIdx(-1);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, categoryId, names]);

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      if (
        !(event.target instanceof Node) ||
        !wrapperRef.current?.contains(event.target)
      ) {
        setIsDropdownOpen(false);
        setActiveSuggestionIdx(-1);
      }
    };

    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, []);

  const addName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || names.includes(trimmed)) return;
    if (names.length >= maxNominees) return;

    onNamesChange([...names, trimmed]);
    setValue("");
    setIsDropdownOpen(false);
  };

  const removeName = (idx: number) => {
    onNamesChange(names.filter((_, i) => i !== idx));
  };

  if (alreadyNominated) {
    return (
      <div className="flex items-center justify-between gap-3 border border-emerald-300/30 bg-gradient-to-r from-emerald-500/10 to-transparent px-4 py-3.5">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon
            icon={faCheckCircle}
            className="shrink-0 text-emerald-300"
          />
          <div>
            <p className="text-white/85 font-gala text-sm font-semibold">
              {submittedName ?? "Nomeação submetida"}
            </p>
            <p className="text-white/45 font-gala text-xs">
              Obrigado pela tua sugestão
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onStartEditing}
          className="shrink-0 rounded-full border border-white/10 p-2 text-white/40 transition hover:border-light-gold/40 hover:text-light-gold"
          title="Alterar nomeação"
        >
          <FontAwesomeIcon icon={faPencil} className="text-xs" />
        </button>
      </div>
    );
  }

  const canAddMore = names.length < maxNominees;

  return (
    <div className="flex flex-col gap-3">
      <div ref={wrapperRef} className="relative">
        <label
          htmlFor={`nomination-input-${categoryId}`}
          className="mb-1.5 block font-gala text-[0.68rem] font-bold uppercase tracking-[0.28em] text-light-gold/60"
        >
          {maxNominees > 1
            ? `Nomeados (${names.length}/${maxNominees})`
            : "Nomeado"}
        </label>

        {/* Selected Names Tags */}
        <div className="mb-2 flex flex-wrap gap-2">
          {names.map((name, idx) => (
            <span
              key={name}
              className="flex items-center gap-2 border border-light-gold/30 bg-light-gold/10 px-3 py-1.5 font-gala text-xs text-white"
            >
              {name}
              <button
                type="button"
                onClick={() => removeName(idx)}
                className="text-white/40 hover:text-red-400"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </span>
          ))}
        </div>

        {canAddMore && (
          <div className="relative">
            <span className="text-white/35 pointer-events-none absolute inset-y-0 left-4 flex items-center">
              <FontAwesomeIcon icon={faSearch} className="text-xs" />
            </span>
            {isLoadingSuggestions && (
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-light-gold/60">
                <FontAwesomeIcon
                  icon={faCircleNotch}
                  className="animate-spin text-xs"
                />
              </span>
            )}
            {!isLoadingSuggestions && value.trim().length > 0 && (
              <button
                type="button"
                onClick={() => addName(value)}
                title="Adicionar nome"
                aria-label="Adicionar nome"
                className="hover:bg-light-gold/15 absolute inset-y-0 right-2 my-auto flex h-8 w-8 items-center justify-center rounded-full text-light-gold/70 transition hover:text-light-gold"
              >
                <FontAwesomeIcon icon={faPlus} className="text-xs" />
              </button>
            )}
            <input
              id={`nomination-input-${categoryId}`}
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setIsDropdownOpen(e.target.value.trim().length >= 2);
              }}
              onFocus={() => {
                if (value.trim().length >= 2) setIsDropdownOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (!isDropdownOpen) setIsDropdownOpen(true);
                  setActiveSuggestionIdx((prev) =>
                    Math.min(prev + 1, suggestions.length - 1),
                  );
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveSuggestionIdx((prev) => Math.max(prev - 1, 0));
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (
                    isDropdownOpen &&
                    activeSuggestionIdx >= 0 &&
                    suggestions[activeSuggestionIdx]
                  ) {
                    addName(suggestions[activeSuggestionIdx]);
                    return;
                  }
                  if (value.trim()) {
                    addName(value);
                  }
                }
                if (e.key === "Escape") {
                  setIsDropdownOpen(false);
                  setActiveSuggestionIdx(-1);
                }
              }}
              placeholder={
                names.length === 0
                  ? "Escreve um nome..."
                  : "Adiciona outro nome..."
              }
              className="border-white/15 w-full border bg-black/30 py-3 pl-10 pr-10 font-gala text-sm text-white placeholder:text-white/30 focus:border-light-gold/60 focus:outline-none"
            />
          </div>
        )}

        {isDropdownOpen && value.trim().length >= 2 && (
          <ul
            ref={listRef}
            className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto border border-light-gold/20 bg-[#0e0e0f]/95 p-1 shadow-2xl backdrop-blur-sm"
          >
            {suggestions.map((s, idx) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => addName(s)}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left font-gala text-sm transition ${
                    idx === activeSuggestionIdx
                      ? "bg-light-gold/15 text-light-gold"
                      : "text-white/75 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{s}</span>
                  <FontAwesomeIcon
                    icon={faUserCheck}
                    className="opacity-55 text-[0.65rem]"
                  />
                </button>
              </li>
            ))}

            {!isLoadingSuggestions && suggestions.length === 0 && (
              <li className="text-white/45 px-3 py-3 font-gala text-xs">
                Sem sugestões para este texto. Podes continuar e adicionar mesmo
                assim.
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-white/45 font-gala text-[0.72rem]">
          {maxNominees > 1
            ? `Adiciona entre ${minNominees} e ${maxNominees} pessoas.`
            : "Escreve pelo menos 2 letras para sugerir nomes."}
        </p>
      </div>

      {error && <p className="text-xs text-red-400/80">{error}</p>}
    </div>
  );
}
