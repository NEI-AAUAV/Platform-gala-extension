import { useCallback, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faCircleCheck,
  faHandDots,
  faSeedling,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import GalaService from "@/services/GalaService";
import { FrangoIcon } from "@/assets/icons";
import Input from "@/components/Input";
import useTables from "@/hooks/tableHooks/useTables";
import useTime from "@/hooks/timeHooks/useTime";
import useLimits from "@/hooks/useLimits";

const orange = { color: "#DD8500" };
const green = { color: "#198754" };
const red = { color: "#DC3545" };

const iconMap = new Map([
  ["NOR", <FrangoIcon key="NOR" style={orange} />],
  ["VEG", <FontAwesomeIcon key="VEG" icon={faSeedling} style={green} />],
]);

type InfoProps = Readonly<{ title: string; values: number[] }>;

function Info({ title, values }: InfoProps) {
  return (
    <div className="rounded-xl border border-dark-gold/20 bg-dark-gold/5 p-4 shadow-sm backdrop-blur">
      <div className="mx-auto flex flex-col justify-between">
        <span className="text-sm font-medium text-dark-gold/70">{title}</span>
        <div className="mt-2 text-2xl font-bold text-dark-gold">
          {values.map((v, idx) => (
            <span key={title + v + String(idx)}>
              {idx > 0 && <span className="mx-1 text-dark-gold/40">/</span>}
              {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

type TimeSlotsProps = Readonly<{
  start: "tablesStart" | "votesStart";
  end: "tablesEnd" | "votesEnd";
}>;

function TimeSlots({
  start,
  end,
}: TimeSlotsProps) {
  const { time } = useTime();
  const [notDirty, setNotDirty] = useState(false);
  const [openingTime, setOpeningTime] = useState<string | undefined>();
  const [closingTime, setClosingTime] = useState<string | undefined>();

  useEffect(() => {
    setOpeningTime(time?.[start].slice(0, 16));
    setClosingTime(time?.[end].slice(0, 16));
  }, [time, start, end]);

  useEffect(() => {
    setNotDirty(
      (time?.[start]?.startsWith(openingTime || "") &&
        time?.[end]?.startsWith(closingTime || "")) ??
        false,
    );
  }, [openingTime, closingTime, time, start, end]);

  const handleSubmit = () => {
    if (!time) return;
    GalaService.time.editTimeSlots({ [start]: openingTime, [end]: closingTime }).then((res) => {
      setNotDirty(
        (res[start]?.startsWith(openingTime || "") &&
          res[end]?.startsWith(closingTime || "")) ??
          false,
      );
      if (time) {
        time[start] = openingTime || "";
        time[end] = closingTime || "";
      }
    });
  };

  const timeSlotsStatus = useCallback(() => {
    if (!openingTime || !closingTime) return "";
    const openDate = new Date(openingTime);
    const closeDate = new Date(closingTime);
    const currentDate = new Date();
    currentDate.setHours(currentDate.getHours() - 1);
    if (currentDate < openDate) {
      return "Por abrir";
    }
    if (currentDate >= openDate && currentDate <= closeDate) {
      return "Aberto";
    }
    return "Fechado";
  }, [openingTime, closingTime]);

  return (
    <form className="flex flex-col gap-3 rounded-lg border border-dark-gold/20 bg-dark-gold/5 p-4">
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm text-dark-gold/80">Abrir</span>
        <Input
          type="datetime-local"
          className="w-48 bg-transparent px-3 py-1 text-sm text-dark-gold border border-dark-gold/20 placeholder-dark-gold/50"
          value={openingTime || ""}
          onChange={(e) => setOpeningTime(e.target.value)}
        />
      </label>
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm text-dark-gold/80">Fechar</span>
        <Input
          type="datetime-local"
          className="w-48 bg-transparent px-3 py-1 text-sm text-dark-gold border border-dark-gold/20 placeholder-dark-gold/50"
          value={closingTime || ""}
          onChange={(e) => setClosingTime(e.target.value)}
        />
      </label>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-bold text-dark-gold/60">
          {timeSlotsStatus()}
        </span>
        <button
          className="rounded-full bg-dark-gold px-4 py-1 text-sm font-semibold text-black transition-colors hover:bg-yellow-600 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={notDirty}
          type="button"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}

function AddTable() {
  const [tableSize, setTableSize] = useState<number | undefined>();

  function addTable() {
    if (!tableSize) return;
    GalaService.table.createTable({ seats: tableSize }).then(() => {
      globalThis.location.reload();
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dark-gold/20 bg-dark-gold/5 p-4 h-[126px]">
      <Input
        className="w-full bg-transparent px-3 py-1 text-dark-gold border border-dark-gold/20 placeholder:text-dark-gold/50"
        type="number"
        min={1}
        placeholder="Nº de Lugares"
        onChange={(e) =>
          setTableSize(Number.parseInt(e.target.value, 10) || undefined)
        }
        value={tableSize || ""}
      />
      <button
        className="shrink-0 rounded-full bg-dark-gold px-4 py-1 font-semibold text-black hover:bg-yellow-600"
        type="button"
        onClick={addTable}
      >
        Adicionar
      </button>
    </div>
  );
}

function RegistrationLimit() {
  const { limits, refresh } = useLimits();
  const [maxRegistrations, setMaxRegistrations] = useState<number>(0);

  useEffect(() => {
    if (!limits) return;
    setMaxRegistrations(limits.maxRegistrations);
  }, [limits]);

  function updateMaxRegistrations() {
    if (limits?.maxRegistrations === maxRegistrations) return;
    GalaService.limits.editTimeSlots({ maxRegistrations }).then(() => {
      refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dark-gold/20 bg-dark-gold/5 p-4 h-[126px]">
      <Input
        className="w-full bg-transparent px-3 py-1 text-dark-gold border border-dark-gold/20 placeholder:text-dark-gold/50"
        type="number"
        min={1}
        placeholder="Limite Inscrições"
        onChange={(e) => {
          const num = Number.parseInt(e.target.value, 10);
          if (!Number.isNaN(num)) setMaxRegistrations(num);
        }}
        value={maxRegistrations || ""}
      />
      <button
        className="shrink-0 rounded-full bg-dark-gold px-4 py-1 font-semibold text-black hover:bg-yellow-600"
        type="button"
        onClick={updateMaxRegistrations}
      >
        Atualizar
      </button>
    </div>
  );
}

export default function TablesAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const confirmPaymentModalRef = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const selectedUser = useRef<number | null>(null);
  const { tables } = useTables();

  useEffect(() => {
    GalaService.user.listUsers().then((data) => {
      setUsers(data);
    });
  }, []);

  const persons: Person[] = tables.reduce((acc: Person[], table) => {
    return acc.concat(table.persons);
  }, []);

  const usersExtended: UserExtended[] = users.map((u) => {
    const match = persons.find((p) => p.id === u._id);
    return { companions: [], ...u, ...match } as UserExtended;
  });

  const sumOfAllCompanions = persons.reduce(
    (sum, p) => sum + (p.companions?.length ?? 0),
    0,
  );

  const sumOfAllVegetarians = persons.reduce(
    (sum, p) =>
      sum +
      (p.dish === "VEG" ? 1 : 0) +
      (p.companions?.filter((c: Companion) => c.dish === "VEG").length ?? 0),
    0,
  );

  const sumOfAllPayments = users.reduce(
    (sum, u) => sum + (u.has_payed ? 1 : 0),
    0,
  );

  function modalConfirmPayment(id: number) {
    selectedUser.current = id;
    confirmPaymentModalRef.current?.showModal();
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── Dashboard Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Info
          title="Reservas / Inscritos"
          values={[
            persons.length + sumOfAllCompanions,
            users.length + sumOfAllCompanions,
          ]}
        />
        <Info title="Vegetarianos" values={[sumOfAllVegetarians]} />
        <Info title="Pagamentos" values={[sumOfAllPayments, users.length]} />
      </div>

      {/* ── Control Center ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="font-gala text-xl font-bold text-dark-gold">
            Horário: Reservar Mesas
          </h2>
          <TimeSlots start="tablesStart" end="tablesEnd" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-gala text-xl font-bold text-dark-gold">
            Horário: Votações
          </h2>
          <TimeSlots start="votesStart" end="votesEnd" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-gala text-xl font-bold text-dark-gold">
            Adicionar Mesa
          </h2>
          <AddTable />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-gala text-xl font-bold text-dark-gold">
            Limite de Inscrições
          </h2>
          <RegistrationLimit />
        </div>
      </div>

      {/* ── Users Table ──────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-dark-gold/20 bg-dark-gold/5 backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-dark-gold">
            <thead className="bg-dark-gold/10 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">NMec</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">Matrícula</th>
                <th className="px-6 py-3">Prato</th>
                <th className="px-6 py-3">Estado do Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-gold/10">
              {usersExtended.map((user: UserExtended) => [
                <tr
                  key={user._id}
                  className="group transition-colors hover:bg-dark-gold/10"
                >
                  <th className="whitespace-nowrap px-6 py-4 font-medium">
                    {user.nmec}
                  </th>
                  <td className="px-6 py-4">{user.email}</td>
                  <td className="px-6 py-4">{user.name}</td>
                  <td className="px-6 py-4">
                    {user.matriculation
                      ? `${user.matriculation}º ano`
                      : "Outro"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {iconMap.get(user.dish)}
                      {user.allergies && (
                        <FontAwesomeIcon
                          style={red}
                          icon={faHandDots}
                          title={user.allergies}
                        />
                      )}
                      <span
                        className="max-w-[100px] truncate"
                        title={user.allergies}
                      >
                        {user.allergies}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.has_payed ? (
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon style={green} icon={faCircleCheck} />
                        Pago
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon
                          className="text-yellow-500"
                          icon={faCheck}
                        />
                        A aguardar
                        <button
                          className="ml-2 rounded-full border border-dark-gold px-3 py-1 text-xs opacity-0 transition-colors hover:bg-dark-gold hover:text-black group-hover:opacity-100"
                          onClick={() => modalConfirmPayment(user._id)}
                          type="button"
                        >
                          Confirmar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>,
                ...(user.companions || []).map((c, idx) => (
                  <tr key={`c${user._id}-${idx}`} className="bg-dark-gold/5">
                    <th className="px-6 py-2" />
                    <td className="px-6 py-2" />
                    <td className="px-6 py-2" />
                    <td className="px-6 py-2 text-xs italic text-dark-gold/50">
                      Acompanhante
                    </td>
                    <td className="px-6 py-2">
                      <div className="flex items-center gap-3">
                        {iconMap.get(c.dish)}
                        {c.allergies && (
                          <FontAwesomeIcon
                            style={red}
                            icon={faHandDots}
                            title={c.allergies}
                          />
                        )}
                        <span
                          className="max-w-[100px] truncate text-xs"
                          title={c.allergies}
                        >
                          {c.allergies}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-2" />
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </div>

      <dialog
        className="rounded-xl border border-dark-gold/20 bg-[#121212] p-0 text-dark-gold shadow-2xl backdrop:bg-black/80"
        ref={confirmPaymentModalRef}
      >
        <div className="p-8 pb-6">
          <h2 className="font-gala text-2xl font-bold">Confirmar Pagamento</h2>
          <p className="mt-2 text-dark-gold/70">
            Tens a certeza que queres confirmar o pagamento deste utilizador?
          </p>
        </div>
        <div className="flex justify-end gap-3 bg-dark-gold/5 px-8 py-4">
          <button
            type="button"
            className="rounded-full px-6 py-2 font-semibold text-dark-gold/70 transition-colors hover:bg-dark-gold/10 hover:text-dark-gold"
            onClick={() => confirmPaymentModalRef.current?.close()}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-full bg-dark-gold px-6 py-2 font-semibold text-black transition-colors hover:bg-yellow-600"
            onClick={async () => {
              confirmPaymentModalRef.current?.close();
              if (selectedUser.current === null) return;
              await GalaService.user.editUser({
                id: selectedUser.current,
                has_payed: true,
              });
              navigate(0);
            }}
          >
            Confirmar
          </button>
        </div>
      </dialog>
    </div>
  );
}
