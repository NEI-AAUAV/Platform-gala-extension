import type { MealOption } from "@/config/registrationConfig";

const DISH_TYPE_LABELS: Record<string, string> = {
  NOR: "Carne",
  FISH: "Peixe",
  VEG: "Vegetariano",
  VEGAN: "Vegan",
};

const KNOWN_DISH_TYPES = new Set(["NOR", "FISH", "VEG", "VEGAN"]);

function normalizeToDishType(raw: string, mealOptions: MealOption[]): string {
  const byId = mealOptions.find((m) => m.id === raw);
  if (byId) return byId.dishType;
  const upper = raw.toUpperCase();
  if (KNOWN_DISH_TYPES.has(upper)) return upper;
  return raw;
}

function resolveMealLabel(raw: string, mealOptions: MealOption[]): string {
  if (!raw || raw === "—") return "—";
  // Normalize to dishType first so "meat" and "NOR" both resolve to the same label.
  const dishType = normalizeToDishType(raw, mealOptions);
  const byDishType = mealOptions.find(
    (m) => m.dishType.toUpperCase() === dishType.toUpperCase(),
  );
  if (byDishType) return byDishType.label;
  return DISH_TYPE_LABELS[dishType.toUpperCase()] ?? raw;
}

export interface RegistrantsStats {
  total: number;
  totalPersons: number;
  totalCompanions: number;
  paid: number;
  proofSent: number;
  pending: number;
  withTable: number;
  withBus: number;
  byYear: Record<string, number>;
  byMeal: Record<string, number>;
  byBusOption: Record<string, number>;
}

export function computeStats(
  users: User[],
  mealOptions: MealOption[] = [],
): RegistrantsStats {
  const byYear: Record<string, number> = {};
  const byMeal: Record<string, number> = {};
  const byBusOption: Record<string, number> = {};
  let totalCompanions = 0;

  for (const u of users) {
    const yr = u.matriculation ? `${u.matriculation}º ano` : "Alumni";
    const companionCount = u.companions?.length ?? 0;
    byYear[yr] = (byYear[yr] ?? 0) + 1 + companionCount;
    const meal = resolveMealLabel(u.meal_option ?? "—", mealOptions);
    byMeal[meal] = (byMeal[meal] ?? 0) + 1;
    byBusOption[u.bus_option] = (byBusOption[u.bus_option] ?? 0) + 1;
    totalCompanions += companionCount;

    for (const c of u.companions ?? []) {
      const companionMeal = resolveMealLabel(
        (c as Companion & { meal?: string }).dish ||
          (c as Companion & { meal?: string }).meal ||
          "—",
        mealOptions,
      );
      byMeal[companionMeal] = (byMeal[companionMeal] ?? 0) + 1;
      byBusOption[u.bus_option] = (byBusOption[u.bus_option] ?? 0) + 1;
    }
  }

  return {
    total: users.length,
    totalCompanions,
    totalPersons: users.length + totalCompanions,
    paid: users.filter((u) => u.has_payed).length,
    proofSent: users.filter(
      (u) =>
        !u.has_payed &&
        ((!u.payment_phase1_confirmed && u.payment_proof_url) ||
          (u.phased_payment &&
            !u.payment_phase2_confirmed &&
            u.payment_proof_url_phase2)),
    ).length,
    pending: users.filter(
      (u) =>
        !u.has_payed &&
        !u.payment_expired &&
        !u.payment_proof_url &&
        !u.payment_proof_url_phase2,
    ).length,
    withTable: users.reduce(
      (acc, u) =>
        acc + (u.table_id === null ? 0 : 1 + (u.companions?.length ?? 0)),
      0,
    ),
    withBus: users.reduce(
      (acc, u) =>
        acc + (u.bus_option === "NONE" ? 0 : 1 + (u.companions?.length ?? 0)),
      0,
    ),
    byYear,
    byMeal,
    byBusOption,
  };
}
