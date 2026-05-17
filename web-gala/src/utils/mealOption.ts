import type { MealOption } from "@/config/registrationConfig";

// Fallback labels for legacy dishType values not present in the active config.
const FALLBACK: Record<string, string> = {
  NOR: "Carne",
  FISH: "Peixe",
  VEG: "Vegetariano",
  VEGAN: "Vegan",
};

/**
 * Resolves any raw meal_option value (config id OR dishType, any case) to the
 * matching MealOption from the active config, or a synthetic fallback entry.
 * Returns null only when the raw value is empty.
 */
export function resolveMealOption(
  raw: string | null | undefined,
  mealOptions: MealOption[],
): MealOption | null {
  if (!raw || raw === "—") return null;

  const byId = mealOptions.find((m) => m.id === raw);
  if (byId) return byId;

  const upper = raw.toUpperCase();
  const byDishType = mealOptions.find(
    (m) => m.dishType.toUpperCase() === upper,
  );
  if (byDishType) return byDishType;

  if (FALLBACK[upper]) {
    return {
      id: upper,
      label: FALLBACK[upper],
      description: "",
      dishType: upper as MealOption["dishType"],
    };
  }

  return null;
}

export function getMealLabel(
  raw: string | null | undefined,
  mealOptions: MealOption[],
): string {
  return resolveMealOption(raw, mealOptions)?.label ?? raw ?? "—";
}

export function getMealDishType(
  raw: string | null | undefined,
  mealOptions: MealOption[],
): string | null {
  return resolveMealOption(raw, mealOptions)?.dishType ?? null;
}
