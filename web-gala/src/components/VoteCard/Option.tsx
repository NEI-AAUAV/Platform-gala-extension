import classNames from "classnames";
import { useFormContext, useWatch } from "react-hook-form";
import config from "@/config";

type OptionProps = Readonly<{
  name: string;
  photo_path: string;
  disabled?: boolean;
  optionIdx?: number;
  catId?: number;
}>;

export default function Option({
  name,
  photo_path,
  optionIdx,
  disabled,
  catId,
}: OptionProps) {
  const { setValue } = useFormContext();
  const currentSelected = useWatch({
    name: `votes.${catId}.option`,
  });

  return (
    <button
      type="button"
      disabled={disabled}
      className={classNames(
        "flex flex-row items-center gap-2 rounded-full border p-2 transition-colors duration-300 ease-in-out",
        {
          "border-transparent bg-gradient-to-r from-[#c9a843] to-[#8a6a20]":
            currentSelected === optionIdx, // Selected state
          "border-dark-gold bg-black/20": currentSelected !== optionIdx, // Default state
        },
      )}
      onClick={() => {
        setValue(`votes.${catId}.option`, optionIdx);
      }}
    >
      {catId != null && catId !== 0 && (
        <img
          src={
            photo_path.startsWith("http")
              ? photo_path
              : `${config.BASE_URL}/gala/categories/${photo_path}`
          }
          alt={name}
          className="inline-block h-8 w-8 rounded-full object-cover object-center"
        />
      )}
      <span
        className={classNames(
          "bg-clip-text text-left font-gala font-semibold transition-all duration-300 ease-in-out ",
          {
            "text-black": currentSelected === optionIdx, // Gradient text when selected
            "bg-gradient-to-r from-[#c9a843] to-[#8a6a20] text-transparent":
              currentSelected !== optionIdx, // Default text color
          },
        )}
      >
        {name}
      </span>
    </button>
  );
}

Option.defaultProps = {
  disabled: false,
  optionIdx: 0,
  catId: 0,
};
