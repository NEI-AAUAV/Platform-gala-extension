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

export function computeStats(users: User[]): RegistrantsStats {
  const byYear: Record<string, number> = {};
  const byMeal: Record<string, number> = {};
  const byBusOption: Record<string, number> = {};
  let totalCompanions = 0;

  for (const u of users) {
    const yr = u.matriculation ? `${u.matriculation}º ano` : "Alumni";
    const companionCount = u.companions?.length ?? 0;
    byYear[yr] = (byYear[yr] ?? 0) + 1 + companionCount;
    const meal = u.meal_option ?? "—";
    byMeal[meal] = (byMeal[meal] ?? 0) + 1;
    byBusOption[u.bus_option] = (byBusOption[u.bus_option] ?? 0) + 1;
    totalCompanions += companionCount;

    for (const c of u.companions ?? []) {
      const companionMeal =
        (c as Companion & { meal?: string }).dish ||
        (c as Companion & { meal?: string }).meal ||
        "—";
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
