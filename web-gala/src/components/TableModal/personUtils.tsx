import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHandDots,
  faSeedling,
  faFish,
  faLeaf,
} from "@fortawesome/free-solid-svg-icons";
import { FrangoIcon } from "@/assets/icons";
import { MealOption } from "@/config/registrationConfig";
import { useRegistrationConfig } from "@/hooks/useRegistrationConfig";

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

/** Resolve a dish value (config meal ID or legacy DishType string) to a DishType key. */
export function getDishType(
  raw: string | null | undefined,
  mealOptions: MealOption[],
): string | null {
  if (!raw) return null;
  const byId = mealOptions.find((m) => m.id === raw);
  if (byId) return byId.dishType;
  const upper = raw.toUpperCase();
  if (iconMap.has(upper)) return upper;
  return null;
}

/** Get the dish icon for a companion dish value (config ID or legacy DishType). */
export function getIconForMealId(
  raw: string | null | undefined,
  mealOptions: MealOption[],
) {
  const dishType = getDishType(raw, mealOptions);
  return dishType ? iconMap.get(dishType) ?? null : null;
}

/** Count companions whose dish resolves to the given DishType category. */
export function countByDishType(
  person: Person,
  dishType: string,
  mealOptions: MealOption[],
): number {
  return person.companions.filter(
    (c) => getDishType(c.dish, mealOptions) === dishType,
  ).length;
}

/** @deprecated Use countByDishType for config-ID-based companion dishes. */
export function countByDish(person: Person, dish: string) {
  return person.companions.filter((companion) => companion.dish === dish)
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
  const { config } = useRegistrationConfig();
  const { mealOptions } = config;

  if (person.companions.length === 0) return null;
  const norCount = countByDishType(person, "NOR", mealOptions);
  const fishCount = countByDishType(person, "FISH", mealOptions);
  const vegCount = countByDishType(person, "VEG", mealOptions);
  const veganCount = countByDishType(person, "VEGAN", mealOptions);
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
