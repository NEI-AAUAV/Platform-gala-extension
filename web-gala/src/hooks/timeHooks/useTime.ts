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
    (async () => {
      const response = await GalaService.time.getTimeSlots();
      const registrationStatus = getTimeStatus(
        response.registrationStart,
        response.registrationEnd,
      );
      const nominationsStatus = getTimeStatus(
        response.nominationsStart,
        response.nominationsEnd,
      );
      const votesStatus = getTimeStatus(response.votesStart, response.votesEnd);
      const tablesStatus = getTimeStatus(
        response.tablesStart,
        response.tablesEnd,
      );
      const galaStatus = getTimeStatus(
        response.galaStart,
        "2099-12-31T23:59:59Z", // Gala doesn't "end" in terms of visibility usually
      );
      setTime({
        ...response,
        registrationStatus,
        nominationsStatus,
        votesStatus,
        tablesStatus,
        galaStatus,
      });
    })();
  }, []);

  return { time };
}
