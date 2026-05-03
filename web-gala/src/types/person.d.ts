type Companion = {
  name: string;
  dish: string;
  allergies: string;
  email?: string | null;
};


type Person = {
  id: number;
  allergies: string;
  dish: string;
  confirmed: boolean;
  companions: Companion[];
};
