import useSWR from "swr";
import GalaService from "@/services/GalaService";

const EMPTY_VOTES: Vote[] = [];

export default function useVotes() {
  const { data, error, isLoading, mutate } = useSWR<Vote[]>(
    "/votes/list",
    () => GalaService.vote.listCategories(),
    { refreshInterval: 30_000, dedupingInterval: 15_000 },
  );

  return {
    votes: data ?? EMPTY_VOTES,
    isLoading,
    isError: error,
    mutate,
  };
}
