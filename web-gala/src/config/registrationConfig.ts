export type PaymentMethod = "mbway" | "iban" | "both";

export interface MealOption {
  id: string;
  label: string;
  description: string;
  dishType: "NOR" | "FISH" | "VEG" | "VEGAN";
}

export interface PaymentContact {
  id?: string;
  year: string;
  name: string;
  phone: string;
}

export interface RegistrationConfig {
  eventLocation: string;
  eventPrice: number;
  eventIncludes: string[];
  eventRules: string[];
  busEnabled: boolean;
  busRoundTripPrice: number;
  mealOptions: MealOption[];
  allergiesRequired: boolean;
  paymentMethod: PaymentMethod;
  ibanNumber: string;
  ibanHolder: string;
  paymentDeadlineHours: number;
  paymentDeadlineDate: string;
  paymentContacts: PaymentContact[];
  paymentEmail: string;
  paymentDescription: string;
  phasedPaymentEnabled: boolean;
  phase1Price: number;
  phase2Price: number;
  phase1Deadline: string;
  phase2Deadline: string;
}

export const defaultConfig: RegistrationConfig = {
  eventLocation: "A anunciar, Aveiro",
  eventPrice: 38,
  eventIncludes: [
    "Entradas",
    "Sopa",
    "Prato principal (carne ou vegetariano/vegan)",
    "Sobremesa",
    "AfterParty - bar aberto",
    "Transporte (incluído no preço)",
  ],
  eventRules: [
    "Inscrições limitadas - garante o teu lugar.",
    "O pagamento deve ser efetuado nas 48h após a inscrição.",
    "Em caso de não comparência não há reembolso.",
    "O comprovativo de pagamento deve ser enviado por email.",
  ],
  busEnabled: true,
  busRoundTripPrice: 0,
  mealOptions: [
    { id: "meat", label: "Carne", description: "Arroz de Pato", dishType: "NOR" as const },
    {
      id: "veg",
      label: "Vegetariano / Vegan",
      description: "Tofu com legumes salteados",
      dishType: "VEG" as const,
    },
  ],
  allergiesRequired: false,
  paymentMethod: "both",
  ibanNumber: "",
  ibanHolder: "NEI - Núcleo de Estudantes de Informática",
  paymentDeadlineHours: 48,
  paymentDeadlineDate: "A anunciar",
  paymentContacts: [
    { year: "1ª", name: "Sara Almeida", phone: "967 892 167" },
    { year: "2ª", name: "Roberto Castro", phone: "916 162 223" },
    { year: "3ª", name: "Marta Inácio", phone: "934 656 375" },
    { year: "4ª", name: "Renato Dias", phone: "925 097 774" },
    { year: "5ª+", name: "Tiago Gomes", phone: "927 144 824" },
  ],
  paymentEmail: "galacomissao.nei@gmail.com",
  paymentDescription: "Pagamento Jantar de Gala de <Nome> - <Nmec>",
  phasedPaymentEnabled: true,
  phase1Price: 20,
  phase2Price: 18,
  phase1Deadline: "A anunciar",
  phase2Deadline: "A anunciar",
};
