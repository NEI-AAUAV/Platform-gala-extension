import Requester from "./Requester";

type AcceptTableProps = {
  persons: Person[];
  tableId: number;
  seats: number;
  mutate: () => void;
};

export default function AcceptPending({
  persons,
  tableId,
  seats,
  mutate,
}: Readonly<AcceptTableProps>) {
  const filteredPersons = persons.filter((person) => !person.confirmed);
  const confirmedSeats = persons
    .filter((p) => p.confirmed)
    .reduce((acc, p) => acc + 1 + p.companions.length, 0);

  return (
    <div className="w-full">
      <h3 className="text-xl font-semibold">
        {filteredPersons.length !== 0 && "Pendentes de Confirmação"}
      </h3>
      {filteredPersons.map((person) => (
        <div key={person.id} className="">
          <div className="flex items-start gap-2">
            <Requester
              person={person}
              tableId={tableId}
              mutate={mutate}
              isFull={confirmedSeats + 1 + person.companions.length > seats}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
