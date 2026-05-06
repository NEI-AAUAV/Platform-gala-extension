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

const getTimeStatus = (startTime: string, endTime: string) => {
  const openDate = new Date(startTime);
  const closeDate = new Date(endTime);
  const currentDate = new Date();
  currentDate.setHours(currentDate.getHours() - 1);
  if (currentDate < openDate) {
    return TimeStatus.OPENING;
  }
  if (currentDate >= openDate && currentDate <= closeDate) {
    return TimeStatus.OPEN;
  }
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
