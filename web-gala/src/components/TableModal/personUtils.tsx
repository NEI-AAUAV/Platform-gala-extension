import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHandDots, faSeedling } from "@fortawesome/free-solid-svg-icons";
import { FrangoIcon } from "@/assets/icons";

export const orange = { color: "#DD8500" };
export const green = { color: "#198754" };
export const red = { color: "#DC3545" };

export const iconMap = new Map([
  ["NOR", <FrangoIcon key="NOR" style={orange} />],
  ["VEG", <FontAwesomeIcon key="VEG" icon={faSeedling} style={green} />],
]);

export function allergyIcon(allergies: string) {
  return (
    allergies.length > 0 && <FontAwesomeIcon icon={faHandDots} style={red} />
  );
}

export function countVegetarians(person: Person) {
  return person.companions.filter((companion) => companion.dish === "VEG")
    .length;
}

export function countNormal(person: Person) {
  return person.companions.filter((companion) => companion.dish === "NOR")
    .length;
}

export function countAllergies(person: Person) {
  return person.companions.filter((companion) => companion.allergies.length > 0)
    .length;
}

export const gridTemplate = {
  gridTemplateColumns: "max-content 1fr",
};

export function CompanionSummary({ person }: Readonly<{ person: Person }>) {
  if (person.companions.length === 0) return null;
  const norCount = countNormal(person);
  const vegCount = countVegetarians(person);
  const allergyCount = countAllergies(person);
  return (
    <div className="flex items-center gap-2 font-light">
      <span>{`+${person.companions.length} companions`}</span>
      <span className="flex gap-2">
        {norCount > 0 && (
          <span className="flex items-center gap-2">
            <span className="text-sm text-base-content/70">{norCount}</span>
            <FrangoIcon style={orange} />
          </span>
        )}
        {vegCount > 0 && (
          <span className="flex items-center gap-2">
            <span className="text-sm text-base-content/70">{vegCount}</span>
            <FontAwesomeIcon icon={faSeedling} style={green} />
          </span>
        )}
        {allergyCount > 0 && (
          <span className="flex items-center gap-2">
            <span className="text-sm text-base-content/70">{allergyCount}</span>
            <FontAwesomeIcon icon={faHandDots} style={red} />
          </span>
        )}
      </span>
    </div>
  );
}
