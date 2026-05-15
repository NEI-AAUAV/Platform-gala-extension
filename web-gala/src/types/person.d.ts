type Companion = {
  name: string;
  email: string;
  dish: string;
  allergies: string;
};

type Person = {
  id: number;
  allergies: string;
  dish: string;
  confirmed: boolean;
  companions: Companion[];
};
