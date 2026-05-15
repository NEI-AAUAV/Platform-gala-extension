import { forwardRef, useState } from "react";
import Input from "../../Input";
import MealSelect from "./MealSelect";
import Avatar from "../../Avatar";

type AddUserProps = {
  btn?: { icon?: JSX.Element; onClick: () => void };
  id?: number | null;
  className?: string;
  setName?: (name: string) => void;
  setEmail?: (email: string) => void;
  setDish?: (dish: "NOR" | "VEG") => void;
  setAllergies?: (allergies: string) => void;
};

const AddUser = forwardRef(
  (
    {
      btn,
      id,
      className,
      setName,
      setEmail,
      setDish,
      setAllergies,
    }: AddUserProps,
    ref: React.ForwardedRef<HTMLDivElement>,
  ) => {
    const icon = btn?.icon;
    const onClick = btn?.onClick;
    const [selected, setSelected] = useState<"NOR" | "VEG">("NOR");

    return (
      <div className={`flex items-start gap-2 ${className}`} ref={ref}>
        <Avatar id={id} className="mt-1 shrink-0" />
        <div className="flex flex-1 flex-col gap-2">
          {setName !== undefined && (
            <>
              <Input
                className="px-3 py-2"
                placeholder="Nome completo *"
                onInput={(e) => setName(e.currentTarget.value)}
              />
              <Input
                className="px-3 py-2"
                placeholder="Email *"
                onInput={(e) => setEmail?.(e.currentTarget.value)}
              />
            </>
          )}
          <MealSelect
            onChange={(e) => {
              if (setDish) setDish(e);
            }}
            selected={selected}
            setSelected={setSelected}
          />
          <Input
            className="px-3 py-2"
            placeholder="Alergias (se aplicável)"
            onInput={(e) => {
              if (setAllergies) setAllergies(e.currentTarget.value);
            }}
          />
        </div>
        <button
          className={`mt-1 shrink-0 ${
            icon === undefined
              ? "pointer-events-none invisible cursor-default"
              : ""
          }`}
          type="button"
          onClick={onClick}
        >
          {icon}
        </button>
      </div>
    );
  },
);

AddUser.defaultProps = {
  btn: { icon: undefined, onClick: () => {} },
  className: "",
  id: null,
  setName: undefined,
  setEmail: undefined,
  setAllergies: undefined,
  setDish: undefined,
};

export default AddUser;
