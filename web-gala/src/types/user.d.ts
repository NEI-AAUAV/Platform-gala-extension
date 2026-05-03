type User = {
  _id: number;
  matriculation: number | null;
  nmec: number;
  email: string;
  name: string;
  phone: string | null;
  registration_step: number;
  is_registered: boolean;
  bus_option: "ROUND_TRIP" | "ONE_WAY" | "NONE";
  bus_assignment: string | null;
  meal_option: string | null;
  food_allergies: string | null;
  has_payed: boolean;
  phased_payment: boolean;
  payment_proof_url: string | null;
  payment_proof_url_phase2: string | null;
  table_id: number | null;
  companions: Companion[];
  admin_created?: boolean;
  companion_emails?: string[];
  is_companion_of?: number | null;
};

type UserExtended = User & Person;

