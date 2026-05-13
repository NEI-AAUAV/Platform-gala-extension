import Avatar from "@/components/Avatar";
import useNEIUser from "@/hooks/useNEIUser";
import { iconMap, allergyIcon } from "../personUtils";

type GuestProps = {
  person: Person;
};

export default function Guest({ person }: Readonly<GuestProps>) {
  const { neiUser } = useNEIUser(person.id);
  return (
    <>
      <Avatar id={person.id} className="w-[18px]" />
      <div className="flex items-center gap-2">
        <span>{`${neiUser?.name} ${neiUser?.surname}`}</span>{" "}
        <span className="flex gap-2">
          {iconMap.get(person.dish)}
          {allergyIcon(person.allergies)}
        </span>
      </div>
    </>
  );
}
