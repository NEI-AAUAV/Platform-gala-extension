import useSWR from "swr";
import GalaService from "@/services/GalaService";

export default function useVotes() {
  const { data, error, isLoading, mutate } = useSWR<Vote[]>(
    "/votes/list",
    () => GalaService.vote.listCategories(),
    { refreshInterval: 30_000, dedupingInterval: 15_000 },
  );

  return {
    votes: data ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}
