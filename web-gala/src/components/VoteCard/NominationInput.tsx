import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faCircleNotch,
  faPaperPlane,
  faPencil,
  faSearch,
  faUserCheck,
} from "@fortawesome/free-solid-svg-icons";
import GalaService from "@/services/GalaService";

interface Props {
  readonly categoryId: number;
  readonly alreadyNominated: boolean;
}

function resolveNominationError(reason: unknown): string {
  if (typeof reason === "object" && reason !== null) {
    const r = reason as {
      response?: { status?: number; data?: { detail?: string } };
    };
    if (r.response?.status === 409)
      return "Já nomeaste alguém nesta categoria.";
    if (r.response?.status === 403)
      return "As nomeações desta categoria já fecharam.";
    const detail = r.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return "Erro ao submeter. Tenta novamente.";
}

const storageKey = (categoryId: number) => `gala_nomination_${categoryId}`;

export default function NominationInput({
  categoryId,
  alreadyNominated,
}: Props) {
  const [value, setValue] = useState(
    () => localStorage.getItem(storageKey(categoryId)) ?? "",
  );
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(alreadyNominated);
  const [nominatedName, setNominatedName] = useState<string | null>(() =>
    localStorage.getItem(storageKey(categoryId)),
  );
  const [error, setError] = useState<string | null>(null);
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
        setSuggestions(results);
        setIsDropdownOpen(true);
        setActiveSuggestionIdx(results.length > 0 ? 0 : -1);
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
  }, [value, categoryId]);

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setActiveSuggestionIdx(-1);
      }
    };

    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, []);

  const submit = async () => {
    const name = value.trim();
    if (!name) return;
    setError(null);
    setSubmitting(true);
    try {
      await GalaService.vote.nominate(categoryId, name);
      localStorage.setItem(storageKey(categoryId), name);
      setNominatedName(name);
      setSubmitted(true);
      setSuggestions([]);
      setIsDropdownOpen(false);
    } catch (e) {
      setError(resolveNominationError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = () => {
    setSubmitted(false);
    setError(null);
    setSuggestions([]);
    setIsDropdownOpen(false);
    setActiveSuggestionIdx(-1);
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-between gap-3 border border-emerald-300/30 bg-gradient-to-r from-emerald-500/10 to-transparent px-4 py-3.5">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon
            icon={faCheckCircle}
            className="shrink-0 text-emerald-300"
          />
          <div>
            <p className="font-gala text-sm font-semibold text-white/85">
              {nominatedName ?? "Nomeação submetida"}
            </p>
            <p className="font-gala text-xs text-white/45">
              Obrigado pela tua sugestão
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={startEditing}
          className="shrink-0 rounded-full border border-white/10 p-2 text-white/40 transition hover:border-light-gold/40 hover:text-light-gold"
          title="Alterar nomeação"
        >
          <FontAwesomeIcon icon={faPencil} className="text-xs" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={wrapperRef} className="relative">
        <label
          htmlFor={`nomination-input-${categoryId}`}
          className="mb-1.5 block font-gala text-[0.68rem] font-bold uppercase tracking-[0.28em] text-light-gold/60"
        >
          Nomeado
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-white/35">
            <FontAwesomeIcon icon={faSearch} className="text-xs" />
          </span>
          {isLoadingSuggestions && (
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-light-gold/60">
              <FontAwesomeIcon icon={faCircleNotch} className="animate-spin text-xs" />
            </span>
          )}
          <input
            id={`nomination-input-${categoryId}`}
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
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
                if (isDropdownOpen && activeSuggestionIdx >= 0 && suggestions[activeSuggestionIdx]) {
                  setValue(suggestions[activeSuggestionIdx]);
                  setIsDropdownOpen(false);
                  return;
                }
                submit();
              }
              if (e.key === "Escape") {
                setIsDropdownOpen(false);
                setActiveSuggestionIdx(-1);
              }
            }}
            placeholder="Escreve um nome..."
            className="w-full border border-white/15 bg-black/30 py-3 pl-10 pr-10 font-gala text-sm text-white placeholder:text-white/30 focus:border-light-gold/60 focus:outline-none"
          />
        </div>

        {isDropdownOpen && value.trim().length >= 2 && (
          <ul
            ref={listRef}
            className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto border border-light-gold/20 bg-[#0e0e0f]/95 p-1 shadow-2xl backdrop-blur-sm"
          >
            {suggestions.map((s, idx) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => {
                    setValue(s);
                    setIsDropdownOpen(false);
                    setActiveSuggestionIdx(-1);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left font-gala text-sm transition ${
                    idx === activeSuggestionIdx
                      ? "bg-light-gold/15 text-light-gold"
                      : "text-white/75 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{s}</span>
                  <FontAwesomeIcon icon={faUserCheck} className="text-[0.65rem] opacity-55" />
                </button>
              </li>
            ))}

            {!isLoadingSuggestions && suggestions.length === 0 && (
              <li className="px-3 py-3 font-gala text-xs text-white/45">
                Sem sugestões para este texto. Podes continuar e submeter mesmo assim.
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="font-gala text-[0.72rem] text-white/45">
          Escreve pelo menos 2 letras para sugerir nomes
        </p>
      </div>

      {error && <p className="text-xs text-red-400/80">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || !value.trim()}
        className="flex items-center justify-center gap-2 border border-light-gold/50 bg-gradient-to-r from-light-gold/15 to-dark-gold/10 py-3 font-gala text-sm font-semibold text-light-gold transition hover:border-light-gold hover:from-light-gold/25 hover:to-dark-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />
        {submitting ? "A submeter..." : "Nomear"}
      </button>
    </div>
  );
}
