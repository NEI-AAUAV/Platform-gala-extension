/* eslint-disable react/no-array-index-key */
import Guest from "./Guest";
import { gridTemplate, CompanionSummary } from "../personUtils";

type GuestListProps = {
  persons: Person[];
};

export default function GuestList({ persons }: Readonly<GuestListProps>) {
  const filteredPersons = persons.filter((person) => person.confirmed);
  return (
    <div className="w-full">
      <h3 className="text-xl font-semibold">Convidad@s</h3>
      {filteredPersons.length === 0 && <p>Não há convidad@s nesta mesa</p>}
      <div className="mt-2 flex flex-col gap-2">
        {filteredPersons.map((person) => (
          <div
            key={person.id}
            className="grid items-center gap-2"
            style={gridTemplate}
          >
            <Guest person={person} />
            {person.companions.length > 0 && (
              <>
                <div />
                <CompanionSummary person={person} />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
