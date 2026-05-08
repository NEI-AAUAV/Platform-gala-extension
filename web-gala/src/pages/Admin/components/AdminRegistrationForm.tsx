import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import GalaService, {
  AdminCreateRegistrationBody,
  AdminEditRegistrationBody,
  AuthentikUserResult,
} from "@/services/GalaService";
import { useAppToast } from "@/components/ui/Toast";
import { extractApiError } from "@/utils/apiError";
import { INPUT_CLS } from "./AdminUI";
import { useRegistrationConfig } from "@/hooks/useRegistrationConfig";

interface Props {
  readonly userToEdit?: User | null;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

export default function AdminRegistrationForm({
  userToEdit,
  onClose,
  onSuccess,
}: Props) {
  const [users, setUsers] = useState<AuthentikUserResult[]>([]);
  const [useExisting, setUseExisting] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");

  const [name, setName] = useState(userToEdit?.name || "");
  const [email, setEmail] = useState(userToEdit?.email || "");
  const [nmec, setNmec] = useState(userToEdit?.nmec?.toString() || "");
  const [matriculation, setMatriculation] = useState(
    userToEdit?.matriculation?.toString() || "",
  );
  const [phone, setPhone] = useState(userToEdit?.phone || "");
  const [busOption, setBusOption] = useState(userToEdit?.bus_option || "NONE");
  const [mealOption, setMealOption] = useState(userToEdit?.meal_option || "");
  const [foodAllergies, setFoodAllergies] = useState(
    userToEdit?.food_allergies || "",
  );
  const [phasedPayment, setPhasedPayment] = useState(
    userToEdit?.phased_payment || false,
  );
  const [hasPayed, setHasPayed] = useState(userToEdit?.has_payed || false);
  const [companions, setCompanions] = useState<
    {
      name: string;
      dish: string;
      allergies: string;
      email: string;
      _id: string;
    }[]
  >(
    userToEdit?.companions?.map((c) => ({
      name: c.name,
      dish: c.dish || "",
      allergies: c.allergies || "",
      email: c.email || "",
      _id: crypto.randomUUID(),
    })) || [],
  );

  const [saving, setSaving] = useState(false);
  const toast = useAppToast();
  const { config } = useRegistrationConfig();

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (userToEdit || !useExisting || searchQuery.length < 3) {
      setUsers([]);
      return;
    }

    setSearching(true);
    const timeout = setTimeout(() => {
      GalaService.admin
        .listAuthentikUsers(searchQuery)
        .then(setUsers)
        .catch(() => toast.error("Erro ao procurar utilizadores do Authentik."))
        .finally(() => setSearching(false));
    }, 500);

    return () => clearTimeout(timeout);
  }, [userToEdit, useExisting, searchQuery, toast]);

  const handleEditRegistration = async () => {
    if (!userToEdit) return;
    const body: AdminEditRegistrationBody = {
      name,
      email,
      nmec: nmec ? Number.parseInt(nmec, 10) : undefined,
      matriculation: matriculation ? Number.parseInt(matriculation, 10) : null,
      phone: phone || undefined,
      bus_option: busOption,
      meal_option: mealOption || undefined,
      food_allergies: foodAllergies || undefined,
      phased_payment: phasedPayment,
      has_payed: hasPayed,
      companions: companions.map((c) => ({
        name: c.name,
        dish: c.dish || undefined,
        allergies: c.allergies || undefined,
        email: c.email || undefined,
      })),
    };
    await GalaService.admin.editRegistration(userToEdit._id, body);
    toast.success("Inscrição atualizada com sucesso.");
  };

  const handleCreateRegistration = async () => {
    const body: AdminCreateRegistrationBody = {
      authentik_user_id:
        useExisting && typeof selectedUserId === "number"
          ? selectedUserId
          : undefined,
      name: !useExisting || selectedUserId === "" ? name : undefined,
      email: !useExisting || selectedUserId === "" ? email : undefined,
      nmec: nmec ? Number.parseInt(nmec, 10) : 0,
      matriculation: matriculation
        ? Number.parseInt(matriculation, 10)
        : undefined,
      phone: phone || undefined,
      bus_option: busOption,
      meal_option: mealOption || undefined,
      food_allergies: foodAllergies || undefined,
      phased_payment: phasedPayment,
      companions: companions.map((c) => ({
        name: c.name,
        dish: c.dish || undefined,
        allergies: c.allergies || undefined,
        email: c.email || undefined,
      })),
    };
    await GalaService.admin.createRegistration(body);
    toast.success("Inscrição criada com sucesso.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userToEdit && useExisting && selectedUserId === "") {
      toast.error("Por favor, selecione um utilizador Authentik da lista.");
      return;
    }

    setSaving(true);

    try {
      if (userToEdit) {
        await handleEditRegistration();
      } else {
        await handleCreateRegistration();
      }
      onSuccess();
    } catch (err) {
      toast.error(extractApiError(err, "Erro ao guardar inscrição."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-start justify-between bg-[#0f0f0f] pb-2">
        <div>
          <h2 className="font-gala text-xl font-bold text-white">
            {userToEdit ? "Editar Inscrição" : "Nova Inscrição"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="hover:bg-white/8 flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:text-white/70"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!userToEdit && (
          <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
                <input
                  type="radio"
                  checked={useExisting}
                  onChange={() => setUseExisting(true)}
                />{" "}
                Conta Authentik Existente
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
                <input
                  type="radio"
                  checked={!useExisting}
                  onChange={() => setUseExisting(false)}
                />{" "}
                Criar sem Conta (só email)
              </label>
            </div>

            {useExisting ? (
              <div className="mt-2 flex flex-col gap-1.5">
                <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase text-white/50">
                  <span>Procurar Utilizador Authentik (Nome ou Email)</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={INPUT_CLS}
                    placeholder="Mínimo 3 caracteres..."
                  />
                </label>
                {searching && (
                  <span className="text-xs text-white/40">A procurar...</span>
                )}
                {users.length > 0 && (
                  <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto rounded-xl border border-white/10 p-1">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedUserId(u.id)}
                        className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                          selectedUserId === u.id
                            ? "bg-light-gold/20 text-light-gold"
                            : "text-white/80 hover:bg-white/5"
                        }`}
                      >
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-xs opacity-70">{u.email}</div>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.length >= 3 &&
                  users.length === 0 &&
                  !searching && (
                    <span className="text-xs text-red-400">
                      Nenhum utilizador encontrado.
                    </span>
                  )}
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase text-white/50">
                    <span>Nome Completo</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={INPUT_CLS}
                      required
                    />
                  </label>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase text-white/50">
                    <span>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={INPUT_CLS}
                      required
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {userToEdit && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase text-white/50">
                <span>Nome</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={INPUT_CLS}
                  required
                />
              </label>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase text-white/50">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT_CLS}
                  required
                />
              </label>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase text-white/50">
              <span>NMec</span>
              <input
                type="number"
                value={nmec}
                onChange={(e) => setNmec(e.target.value)}
                className={INPUT_CLS}
              />
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase text-white/50">
              <span>Ano de Matrícula</span>
              <input
                type="number"
                min="1"
                max="5"
                value={matriculation}
                onChange={(e) => setMatriculation(e.target.value)}
                className={INPUT_CLS}
                placeholder="Deixe em branco se Alumni"
              />
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase text-white/50">
              <span>Telefone</span>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={INPUT_CLS}
              />
            </label>
          </div>
          {config.busEnabled && (
            <div className="flex flex-col gap-1.5">
              <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase text-white/50">
                <span>Autocarro</span>
                <select
                  value={busOption}
                  onChange={(e) =>
                    setBusOption(
                      e.target.value as "ROUND_TRIP" | "ONE_WAY" | "NONE",
                    )
                  }
                  className={INPUT_CLS}
                >
                  <option value="NONE">Sem autocarro</option>
                  <option value="ROUND_TRIP">Ida e volta</option>
                  <option value="ONE_WAY">Só ida</option>
                </select>
              </label>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase text-white/50">
              <span>Prato</span>
              <select
                value={mealOption}
                onChange={(e) => setMealOption(e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">Nenhum / Não sabe</option>
                {config.mealOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase text-white/50">
              <span>Alergias</span>
              <input
                type="text"
                value={foodAllergies}
                onChange={(e) => setFoodAllergies(e.target.value)}
                className={INPUT_CLS}
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase text-white/50">
            Pagamento
          </p>
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={hasPayed}
                onChange={(e) => setHasPayed(e.target.checked)}
              />{" "}
              Pagamento Confirmado
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={phasedPayment}
                onChange={(e) => setPhasedPayment(e.target.checked)}
              />{" "}
              Pagamento Faseado
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-white/50">
              Acompanhantes
            </p>
            <button
              type="button"
              onClick={() =>
                setCompanions([
                  ...companions,
                  {
                    name: "",
                    dish: "",
                    allergies: "",
                    email: "",
                    _id: crypto.randomUUID(),
                  },
                ])
              }
              className="flex items-center gap-1 text-xs text-light-gold hover:underline"
            >
              <FontAwesomeIcon icon={faPlus} /> Adicionar
            </button>
          </div>

          {companions.map((c, i) => (
            <div
              key={c._id}
              className="relative flex flex-col gap-2 rounded-lg bg-white/5 p-3"
            >
              <button
                type="button"
                onClick={() =>
                  setCompanions(companions.filter((_, idx) => idx !== i))
                }
                className="absolute right-2 top-2 text-red-400 hover:text-red-300"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
              <div className="mr-6 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nome"
                  value={c.name}
                  onChange={(e) =>
                    setCompanions(
                      companions.map((comp, idx) =>
                        idx === i ? { ...comp, name: e.target.value } : comp,
                      ),
                    )
                  }
                  className={INPUT_CLS}
                  required
                />
                <input
                  type="email"
                  placeholder="Email (opcional)"
                  value={c.email}
                  onChange={(e) =>
                    setCompanions(
                      companions.map((comp, idx) =>
                        idx === i ? { ...comp, email: e.target.value } : comp,
                      ),
                    )
                  }
                  className={INPUT_CLS}
                />
                <select
                  value={c.dish}
                  onChange={(e) =>
                    setCompanions(
                      companions.map((comp, idx) =>
                        idx === i ? { ...comp, dish: e.target.value } : comp,
                      ),
                    )
                  }
                  className={INPUT_CLS}
                >
                  <option value="">Selecione o prato...</option>
                  {config.mealOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Alergias"
                  value={c.allergies}
                  onChange={(e) =>
                    setCompanions(
                      companions.map((comp, idx) =>
                        idx === i
                          ? { ...comp, allergies: e.target.value }
                          : comp,
                      ),
                    )
                  }
                  className={INPUT_CLS}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-4 w-full rounded-xl bg-dark-gold py-2.5 text-sm font-bold text-black transition hover:bg-yellow-600 disabled:opacity-50"
        >
          {saving ? "A guardar..." : "Guardar Inscrição"}
        </button>
      </form>
    </div>
  );
}
