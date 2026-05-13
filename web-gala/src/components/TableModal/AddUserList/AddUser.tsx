import { forwardRef, useState } from "react";
import Input from "../../Input";
import MealSelect from "./MealSelect";
import Avatar from "../../Avatar";

type AddUserProps = {
  btn?: { icon?: JSX.Element; onClick: () => void };
  id?: number | null;
  className?: string;
  setDish?: (dish: "NOR" | "VEG") => void;
  setAllergies?: (allergies: string) => void;
};

const AddUser = forwardRef(
  (
    { btn, id, className, setDish, setAllergies }: AddUserProps,
    ref: React.ForwardedRef<HTMLDivElement>,
  ) => {
    const icon = btn?.icon;
    const onClick = btn?.onClick;
    const [selected, setSelected] = useState<"NOR" | "VEG">("NOR");

    const grid = {
      gridTemplateColumns: `2.5rem 1fr`,
    };

    return (
      <div
        className={`grid items-center justify-start gap-2 ${className}`}
        style={grid}
        ref={ref}
      >
        <Avatar id={id} />
        <MealSelect
          onChange={(e) => {
            if (setDish) setDish(e);
          }}
          selected={selected}
          setSelected={setSelected}
        />

        <button
          className={`${
            icon === undefined
              ? "pointer-events-none invisible cursor-default"
              : ""
          }`}
          type="button"
          onClick={onClick}
        >
          {icon}
        </button>
        <Input
          className="px-3 py-2"
          placeholder="Alergias (se aplicável)"
          onInput={(e) => {
            if (setAllergies) setAllergies(e.currentTarget.value);
          }}
        />
      </div>
    );
  },
);

AddUser.defaultProps = {
  btn: { icon: undefined, onClick: () => {} },
  className: "",
  id: null,
  setAllergies: undefined,
  setDish: undefined,
};

export default AddUser;
