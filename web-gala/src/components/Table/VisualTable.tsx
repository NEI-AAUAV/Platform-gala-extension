import { useState, useEffect } from "react";
import OnVisible from "react-on-visible";
import Wave from "react-wavify";
import Seat from "./Seat";

type VisualTableProps = {
  table: Table;
  className?: string;
  alwaysVisible?: boolean;
};

function calculateOccupiedSeats(persons: Person[]) {
  return persons
    .filter((person) => person.confirmed)
    .reduce((acc, person) => acc + 1 + person.companions.length, 0);
}

function generateSeats(
  seats: number,
  occupiedSeats: number,
  visible: boolean,
): JSX.Element[] {
  const angleVariation = (2 * Math.PI) / seats;
  const initialAngle = Math.PI / 2;

  const totalTime = 150;
  const delayPerSeat = totalTime / seats;

  return Array.from({ length: seats }, (_, i) => {
    const isTaken = occupiedSeats > i;
    const angle = initialAngle - i * angleVariation;
    const delay = i * delayPerSeat;

    return (
      <Seat
        key={i}
        isTaken={isTaken}
        angle={angle}
        isVisible={visible}
        delay={delay}
      />
    );
  });
}

export default function VisualTable({ table, className, alwaysVisible = false }: VisualTableProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alwaysVisible) setVisible(true);
  }, [alwaysVisible]);

  const { seats, persons } = table;
  const occupiedSeats = calculateOccupiedSeats(persons);

  let vacancyState: JSX.Element;
  let backgroundColor = "bg-gradient-to-r from-light-gold to-dark-gold";
  switch (occupiedSeats) {
    case 0: {
      backgroundColor =
        "bg-gradient-radial from-light-gold to-[rgba(235, 213, 181, 0)";
      vacancyState = (
        <div
          className={`flex h-full w-full items-center justify-center overflow-hidden ${backgroundColor}`}
        >
          <span className="text-sm font-bold">Livre</span>
        </div>
      );
      break;
    }
    case seats: {
      vacancyState = (
        <div
          className={`z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-full ${backgroundColor}`}
        >
          <span className="text-xs font-bold">Ocupada</span>
        </div>
      );
      break;
    }
    default: {
      const freeSeats = seats - occupiedSeats;
      const percentageOfFreeSeats = (freeSeats / seats) * 100;

      vacancyState = (
        <div
          className="relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-full border border-transparent"
          style={{
            background:
              "linear-gradient(white, white) padding-box, linear-gradient(to right, #EBD5B5, #B6A080) border-box",
          }}
        >
          <Wave
            className="absolute inset-0 -rotate-6"
            fill="url(#gradient)"
            options={{
              // ! the percentage is inverted for reasons I don't understand
              height: percentageOfFreeSeats,
              amplitude: 4,
              speed: 0.25,
              points: 3,
            }}
          >
            <defs>
              <linearGradient id="gradient">
                <stop offset="0%" stopColor="#EBD5B5" />
                <stop offset="100%" stopColor="#B6A080" />
              </linearGradient>
            </defs>
          </Wave>
          <h1 className="z-10 text-lg font-bold leading-tight">
            {freeSeats}
          </h1>
          <h6 className="z-10 text-[0.6rem] font-light leading-tight">
            LIVRE{freeSeats > 1 && "S"}
          </h6>
        </div>
      );
      break;
    }
  }

  return (
    <OnVisible
      className={`aspect-square ${className ?? "p-10"}`}
      onChange={() => setVisible(true)}
      percent={10}
    >
      {/* The inner div is the actual table circle + surrounding seats.
          Size is fixed at 5rem (80px); seats use Seat's gap calculation.
          The OnVisible wrapper provides extra padding so seats aren't clipped. */}
      <div className="relative aspect-square w-20 select-none">
        {vacancyState}
        {generateSeats(seats, occupiedSeats, visible)}
      </div>
    </OnVisible>
  );
}

VisualTable.defaultProps = {
  className: undefined,
};
