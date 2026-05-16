import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faPaperPlane,
  faPencil,
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
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(alreadyNominated);
  const [nominatedName, setNominatedName] = useState<string | null>(() =>
    localStorage.getItem(storageKey(categoryId)),
  );
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await GalaService.vote.getSuggestions(
          categoryId,
          value,
        );
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, categoryId]);

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
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-between gap-3 border border-green-500/30 bg-green-500/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon
            icon={faCheckCircle}
            className="shrink-0 text-green-400"
          />
          <div>
            <p className="text-sm font-semibold text-white/80">
              {nominatedName ?? "Nomeação submetida"}
            </p>
            <p className="text-xs text-white/40">Obrigado pela tua sugestão</p>
          </div>
        </div>
        <button
          type="button"
          onClick={startEditing}
          className="shrink-0 p-1.5 text-white/30 transition hover:bg-white/5 hover:text-white/60"
          title="Alterar nomeação"
        >
          <FontAwesomeIcon icon={faPencil} className="text-xs" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setSuggestions([]);
          }}
          placeholder="Nome do candidato..."
          className="border-white/15 w-full border bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-dark-gold/60 focus:outline-none"
        />
        {suggestions.length > 0 && (
          <ul
            ref={listRef}
            className="absolute z-10 mt-1 w-full overflow-hidden border border-light-gold/20 bg-[#111] shadow-lg"
          >
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => {
                    setValue(s);
                    setSuggestions([]);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-xs text-red-400/80">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || !value.trim()}
        className="flex items-center justify-center gap-2 border border-dark-gold/40 py-2.5 text-sm font-semibold text-dark-gold transition hover:bg-dark-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />
        {submitting ? "A submeter..." : "Nomear"}
      </button>
    </div>
  );
}
