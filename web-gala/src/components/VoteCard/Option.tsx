import classNames from "classnames";
import { useFormContext, useWatch } from "react-hook-form";
import config from "@/config";

type OptionProps = Readonly<{
  name: string;
  photo_path: string;
  disabled?: boolean;
  optionIdx?: number;
  catId?: number;
  score?: number;
  totalVotes?: number;
  showResults?: boolean;
}>;

export default function Option({
  name,
  photo_path,
  optionIdx,
  disabled,
  catId,
  score = 0,
  totalVotes = 0,
  showResults = false,
}: OptionProps) {
  const { setValue } = useFormContext();
  const currentSelected = useWatch({
    name: `votes.${catId}.option`,
  });

  let checkmarkColor =
    "border-light-gold/30 bg-black/20 text-transparent group-hover:border-light-gold/60";
  if (currentSelected === optionIdx) {
    checkmarkColor = disabled
      ? "border-neutral-500 bg-neutral-600 text-neutral-300"
      : "border-black bg-black text-light-gold";
  }
  const percentage =
    totalVotes > 0 ? Math.round((score / totalVotes) * 100) : 0;

  return (
    <button
      type="button"
      disabled={disabled}
      className={classNames(
        "group relative overflow-hidden rounded-2xl border p-2.5 text-left transition-all duration-300 ease-in-out md:p-3",
        {
          "border-light-gold bg-gradient-to-br from-[#d1b05d] via-[#c9a843] to-[#8a6a20] shadow-[0_0_28px_rgba(201,168,67,0.45)]":
            currentSelected === optionIdx && !disabled,
          "border-light-gold/35 bg-black/30 hover:border-light-gold/70 hover:bg-black/40":
            currentSelected !== optionIdx && !disabled,
          // Disabled styles for already submitted votes
          "cursor-not-allowed border-neutral-700 bg-neutral-800/40 opacity-60":
            disabled && currentSelected !== optionIdx,
          "cursor-not-allowed border-neutral-500 bg-neutral-700/60 shadow-none":
            disabled && currentSelected === optionIdx,
        },
      )}
      onClick={() => {
        if (currentSelected === optionIdx) {
          setValue(`votes.${catId}.option`, null);
        } else {
          setValue(`votes.${catId}.option`, optionIdx);
        }
      }}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {catId != null && catId !== 0 && (
            <div className="relative shrink-0">
              <img
                src={
                  photo_path.startsWith("http")
                    ? photo_path
                    : `${config.BASE_URL}/gala/categories/${photo_path}`
                }
                alt={name}
                className={classNames(
                  "md:h-14 md:w-14 h-11 w-11 rounded-full border-2 object-cover object-center shadow-lg transition-all duration-300",
                  {
                    "scale-[1.03] border-black/50":
                      currentSelected === optionIdx && !disabled,
                    "scale-[1.03] border-neutral-400/50":
                      currentSelected === optionIdx && disabled,
                    "border-light-gold/35 hover:border-light-gold/60":
                      currentSelected !== optionIdx && !disabled,
                    "border-neutral-700":
                      currentSelected !== optionIdx && disabled,
                  },
                )}
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span
              className={classNames(
                "block break-words font-gala text-sm font-bold leading-tight transition-colors duration-300 md:text-base",
                {
                  "text-black": currentSelected === optionIdx && !disabled,
                  "text-neutral-300": currentSelected === optionIdx && disabled,
                  "bg-gradient-to-r from-[#e2c77a] to-[#b38726] bg-clip-text text-transparent":
                    currentSelected !== optionIdx && !disabled,
                  "text-neutral-500": currentSelected !== optionIdx && disabled,
                },
              )}
            >
              {name}
            </span>
            {showResults && (
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className={classNames(
                    "font-gala text-xs font-bold tabular-nums leading-none md:text-sm",
                    currentSelected === optionIdx && !disabled
                      ? "text-black/75"
                      : "text-light-gold/90",
                  )}
                >
                  {percentage}%
                </span>
                <span
                  className={classNames(
                    "font-gala text-[0.65rem] font-semibold uppercase leading-none tracking-wider md:text-xs",
                    currentSelected === optionIdx && !disabled
                      ? "text-black/55"
                      : "text-white/45",
                  )}
                >
                  {score} {score === 1 ? "voto" : "votos"}
                </span>
              </div>
            )}
            {showResults && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className={classNames(
                    "h-full rounded-full transition-all duration-500",
                    currentSelected === optionIdx && !disabled
                      ? "bg-black/60"
                      : "bg-light-gold/70",
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Radio Indicator */}
        <div className="shrink-0">
          <div
            className={classNames(
              "flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-300",
              checkmarkColor,
            )}
          >
            <svg className="h-2.5 w-2.5 fill-current" viewBox="0 0 20 20">
              <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
}

Option.defaultProps = {
  disabled: false,
  optionIdx: 0,
  catId: 0,
  score: 0,
  totalVotes: 0,
  showResults: false,
};
