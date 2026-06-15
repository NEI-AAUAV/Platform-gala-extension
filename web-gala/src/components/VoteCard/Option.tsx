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

const getOptionPhotoSrc = (photoPath: string) =>
  photoPath.startsWith("http")
    ? photoPath
    : `${config.BASE_URL}/gala/categories/${photoPath}`;

const getCheckmarkClass = (isSelected: boolean, disabled: boolean) => {
  if (!isSelected)
    return "border-light-gold/30 bg-black/20 text-transparent group-hover:border-light-gold/60";
  return disabled
    ? "border-neutral-500 bg-neutral-600 text-neutral-300"
    : "border-black bg-black text-light-gold";
};

const getButtonClass = (isSelected: boolean, disabled: boolean) =>
  classNames(
    "group relative overflow-hidden rounded-2xl border p-2.5 text-left transition-all duration-300 ease-in-out md:p-3",
    {
      "border-light-gold bg-gradient-to-br from-[#d1b05d] via-[#c9a843] to-[#8a6a20] shadow-[0_0_28px_rgba(201,168,67,0.45)]":
        isSelected && !disabled,
      "border-light-gold/35 bg-black/30 hover:border-light-gold/70 hover:bg-black/40":
        !isSelected && !disabled,
      "cursor-not-allowed border-neutral-700 bg-neutral-800/40 opacity-60":
        disabled && !isSelected,
      "cursor-not-allowed border-neutral-500 bg-neutral-700/60 shadow-none":
        disabled && isSelected,
    },
  );

const getPhotoClass = (isSelected: boolean, disabled: boolean) =>
  classNames(
    "h-11 w-11 rounded-full border-2 object-cover object-center shadow-lg transition-all duration-300 md:h-14 md:w-14",
    {
      "scale-[1.03] border-black/50": isSelected && !disabled,
      "scale-[1.03] border-neutral-400/50": isSelected && disabled,
      "border-light-gold/35 hover:border-light-gold/60":
        !isSelected && !disabled,
      "border-neutral-700": !isSelected && disabled,
    },
  );

const getNameClass = (isSelected: boolean, disabled: boolean) =>
  classNames(
    "block break-words font-gala text-sm font-bold leading-tight transition-colors duration-300 md:text-base",
    {
      "text-black": isSelected && !disabled,
      "text-neutral-300": isSelected && disabled,
      "bg-gradient-to-r from-[#e2c77a] to-[#b38726] bg-clip-text text-transparent":
        !isSelected && !disabled,
      "text-neutral-500": !isSelected && disabled,
    },
  );

export default function Option({
  name,
  photo_path,
  optionIdx = 0,
  disabled = false,
  catId = 0,
  score = 0,
  totalVotes = 0,
  showResults = false,
}: OptionProps) {
  const { setValue } = useFormContext();
  const currentSelected = useWatch({ name: `votes.${catId}.option` });
  const isSelected = currentSelected === optionIdx;
  const hasCategoryPhoto = catId !== 0 && Boolean(photo_path);
  const percentage =
    totalVotes > 0 ? Math.round((score / totalVotes) * 100) : 0;

  return (
    <button
      type="button"
      disabled={disabled}
      className={getButtonClass(isSelected, disabled)}
      onClick={() =>
        setValue(`votes.${catId}.option`, isSelected ? null : optionIdx)
      }
    >
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {hasCategoryPhoto && (
            <div className="relative shrink-0">
              <img
                src={getOptionPhotoSrc(photo_path)}
                alt={name}
                className={getPhotoClass(isSelected, disabled)}
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className={getNameClass(isSelected, disabled)}>{name}</span>
            {showResults && (
              <>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span
                    className={classNames(
                      "font-gala text-xs font-bold tabular-nums leading-none md:text-sm",
                      isSelected && !disabled
                        ? "text-black/75"
                        : "text-light-gold/90",
                    )}
                  >
                    {percentage}%
                  </span>
                  <span
                    className={classNames(
                      "font-gala text-[0.65rem] font-semibold uppercase leading-none tracking-wider md:text-xs",
                      isSelected && !disabled
                        ? "text-black/55"
                        : "text-white/45",
                    )}
                  >
                    {score} {score === 1 ? "voto" : "votos"}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={classNames(
                      "h-full rounded-full transition-all duration-500",
                      isSelected && !disabled
                        ? "bg-black/60"
                        : "bg-light-gold/70",
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Radio Indicator */}
        <div className="shrink-0">
          <div
            className={classNames(
              "flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-300",
              getCheckmarkClass(isSelected, disabled),
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
