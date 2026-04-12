type User = {
  _id: number;
  matriculation: number;
  nmec: number;
  email: string;
  name: string;
  has_payed: boolean;
  is_registered: boolean;
  bus_option: "ROUND_TRIP" | "ONE_WAY" | "NONE";
  bus_assignment: string | null;
};

type UserExtended = User & Person;
