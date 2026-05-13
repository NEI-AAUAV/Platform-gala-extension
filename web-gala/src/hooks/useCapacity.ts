import useSWR from "swr";
import GalaService from "@/services/GalaService";

export type Capacity = { remaining: number; total: number };

export default function useCapacity() {
  const { data, error, isLoading } = useSWR<Capacity>(
    "/registration/capacity",
    () => GalaService.registration.getCapacity(),
    { refreshInterval: 30_000 },
  );
  return { capacity: data, isLoading, isError: error };
}
