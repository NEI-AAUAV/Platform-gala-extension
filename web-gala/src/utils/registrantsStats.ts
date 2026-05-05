export interface RegistrantsStats {
  total: number;
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

  for (const u of users) {
    const yr = u.matriculation ? `${u.matriculation}º ano` : "Alumni";
    byYear[yr] = (byYear[yr] ?? 0) + 1;
    const meal = u.meal_option ?? "—";
    byMeal[meal] = (byMeal[meal] ?? 0) + 1;
    byBusOption[u.bus_option] = (byBusOption[u.bus_option] ?? 0) + 1;
  }

  return {
    total: users.length,
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
    withTable: users.filter((u) => u.table_id !== null).length,
    withBus: users.filter((u) => u.bus_option !== "NONE").length,
    byYear,
    byMeal,
    byBusOption,
  };
}
