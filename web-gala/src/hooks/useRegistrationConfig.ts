import { useEffect } from "react";
import { RegistrationConfig, defaultConfig, MealOption, PaymentContact } from "@/config/registrationConfig";
import { useConfigStore } from "@/stores/useConfigStore";

function mapFromBackend(backend: Record<string, unknown>): Partial<RegistrationConfig> {
  const dates = (backend.dates as Record<string, string>) ?? {};
  const prices = (backend.prices as Record<string, unknown>) ?? {};
  const bus = (backend.bus as Record<string, unknown>) ?? {};
  const meals = (backend.meals as Array<Record<string, string>>) ?? [];
  const contacts = (prices.contacts as Array<Record<string, string>>) ?? [];

  return {
    eventDate: dates.event_date || "",
    eventTime: dates.event_time || "",
    eventLocation: (backend.event_location as string) || "",
    eventPrice: (prices.total_price as number) || 0,
    eventIncludes: (backend.items_included as string[]) || [],
    eventRules: (backend.rules as string[]) || [],
    registrationOpenDate: dates.registration_start || "",
    registrationCloseDate: dates.registration_end || "",
    tableDeadlineDate: dates.tables_end || "",
    busEnabled: (bus.enabled as boolean) ?? true,
    busRoundTripPrice: (bus.price_round_trip as number) || 0,
    mealOptions: meals.map((m): MealOption => ({
      id: m.id,
      label: m.name,
      description: m.description,
    })),
    phasedPaymentEnabled: (prices.phased_payment_enabled as boolean) ?? false,
    phase1Price: (prices.phase1_amount as number) || 0,
    phase1Deadline: (prices.phase1_deadline as string) || "",
    phase2Price: (prices.phase2_amount as number) || 0,
    phase2Deadline: (prices.phase2_deadline as string) || "",
    ibanNumber: (prices.iban as string) || "",
    ibanHolder: (prices.holder as string) || "",
    paymentDescription: (prices.description_template as string) || "",
    paymentContacts: contacts.map((c): PaymentContact => ({
      name: c.name,
      year: c.year,
      phone: c.phone,
    })),
    allergiesRequired: (backend.allergies_required as boolean) ?? false,
    paymentMethod: (backend.payment_method as RegistrationConfig["paymentMethod"]) || "both",
    paymentDeadlineHours: (backend.payment_deadline_hours as number) || 48,
    paymentDeadlineDate: (backend.payment_deadline_date as string) || "",
    paymentEmail: (backend.payment_email as string) || "",
  };
}

function mapToBackendPatch(config: RegistrationConfig): Record<string, unknown> {
  return {
    _id: "GLOBAL_CONFIG",
    event_name: "Gala Dinner",
    event_location: config.eventLocation,
    event_description: "",
    rules: config.eventRules,
    items_included: config.eventIncludes,
    dates: {
      event_date: config.eventDate,
      event_time: config.eventTime,
      registration_start: config.registrationOpenDate,
      registration_end: config.registrationCloseDate,
      tables_end: config.tableDeadlineDate,
    },
    prices: {
      total_price: config.eventPrice,
      phased_payment_enabled: config.phasedPaymentEnabled,
      phase1_amount: config.phase1Price,
      phase1_deadline: config.phase1Deadline,
      phase2_amount: config.phase2Price,
      phase2_deadline: config.phase2Deadline,
      iban: config.ibanNumber,
      holder: config.ibanHolder,
      description_template: config.paymentDescription,
      contacts: config.paymentContacts,
    },
    bus: {
      enabled: config.busEnabled,
      price_round_trip: config.busRoundTripPrice,
      price_one_way: 0,
      capacity: 50,
    },
    meals: config.mealOptions.map((m) => ({
      id: m.id,
      name: m.label,
      description: m.description,
      is_active: true,
    })),
    max_registrations: 200,
    max_table_size: 10,
    allergies_required: config.allergiesRequired,
    payment_method: config.paymentMethod,
    payment_deadline_hours: config.paymentDeadlineHours,
    payment_deadline_date: config.paymentDeadlineDate,
    payment_email: config.paymentEmail,
  };
}

export function useRegistrationConfig() {
  const { raw, fetch, save } = useConfigStore();

  useEffect(() => {
    if (!raw) fetch();
  }, [raw, fetch]);

  const config: RegistrationConfig = raw
    ? { ...defaultConfig, ...mapFromBackend(raw) }
    : defaultConfig;

  const updateConfig = (updates: Partial<RegistrationConfig>) => {
    const next = { ...config, ...updates };
    save(mapToBackendPatch(next));
  };

  const resetConfig = () => {
    save(mapToBackendPatch(defaultConfig));
  };

  return { config, updateConfig, resetConfig };
}
