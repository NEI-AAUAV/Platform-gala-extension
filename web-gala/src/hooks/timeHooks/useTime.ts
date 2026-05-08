import { useState, useEffect } from "react";
import GalaService from "@/services/GalaService";

export const TimeStatus = {
  OPENING: 0,
  OPEN: 1,
  CLOSED: 2,
};

type TimeExtended = TimeSlots & {
  registrationStatus: number;
  nominationsStatus: number;
  votesStatus: number;
  tablesStatus: number;
  galaStatus: number;
};

const toUtc = (iso: string | null): Date | null => {
  if (!iso) return null;
  const utcIso =
    iso.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + "Z";
  return new Date(utcIso);
};

const getTimeStatus = (startTime: string | null, endTime: string | null) => {
  const openDate = toUtc(startTime);
  const closeDate = toUtc(endTime);
  if (!openDate || !closeDate) return TimeStatus.CLOSED;
  const now = new Date();
  if (now < openDate) return TimeStatus.OPENING;
  if (now >= openDate && now <= closeDate) return TimeStatus.OPEN;
  return TimeStatus.CLOSED;
};

export default function useTime() {
  const [time, setTime] = useState<TimeExtended>();

  useEffect(() => {
    GalaService.time
      .getTimeSlots()
      .then((response) => {
        setTime({
          ...response,
          registrationStatus: getTimeStatus(
            response.registrationStart,
            response.registrationEnd,
          ),
          nominationsStatus: getTimeStatus(
            response.nominationsStart,
            response.nominationsEnd,
          ),
          votesStatus: getTimeStatus(response.votesStart, response.votesEnd),
          tablesStatus: getTimeStatus(response.tablesStart, response.tablesEnd),
          galaStatus: getTimeStatus(response.galaStart, "2099-12-31T23:59:59Z"),
        });
      })
      .catch(() => {
        // time_slots not initialised yet — leave time as undefined
      });
  }, []);

  return { time };
}
