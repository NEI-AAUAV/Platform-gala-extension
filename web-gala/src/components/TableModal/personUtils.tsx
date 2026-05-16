import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHandDots, faSeedling, faFish, faLeaf } from "@fortawesome/free-solid-svg-icons";
import { FrangoIcon } from "@/assets/icons";

export const orange = { color: "#DD8500" };
export const green = { color: "#198754" };
export const teal = { color: "#0D9488" };
export const emerald = { color: "#059669" };
export const red = { color: "#DC3545" };

export const iconMap = new Map([
  ["NOR", <FrangoIcon key="NOR" style={orange} />],
  ["FISH", <FontAwesomeIcon key="FISH" icon={faFish} style={teal} />],
  ["VEG", <FontAwesomeIcon key="VEG" icon={faSeedling} style={green} />],
  ["VEGAN", <FontAwesomeIcon key="VEGAN" icon={faLeaf} style={emerald} />],
]);

export function allergyIcon(allergies: string) {
  return (
    allergies.length > 0 && <FontAwesomeIcon icon={faHandDots} style={red} />
  );
}

export function countByDish(person: Person, dish: string) {
  return person.companions.filter((companion) => companion.dish === dish).length;
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
  const norCount = countByDish(person, "NOR");
  const fishCount = countByDish(person, "FISH");
  const vegCount = countByDish(person, "VEG");
  const veganCount = countByDish(person, "VEGAN");
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
        {fishCount > 0 && (
          <span className="flex items-center gap-2">
            <span className="text-sm text-base-content/70">{fishCount}</span>
            <FontAwesomeIcon icon={faFish} style={teal} />
          </span>
        )}
        {vegCount > 0 && (
          <span className="flex items-center gap-2">
            <span className="text-sm text-base-content/70">{vegCount}</span>
            <FontAwesomeIcon icon={faSeedling} style={green} />
          </span>
        )}
        {veganCount > 0 && (
          <span className="flex items-center gap-2">
            <span className="text-sm text-base-content/70">{veganCount}</span>
            <FontAwesomeIcon icon={faLeaf} style={emerald} />
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
