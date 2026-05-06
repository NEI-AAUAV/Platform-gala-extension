import useSWR from "swr";
import GalaService from "@/services/GalaService";
import useSessionUser, { State } from "../userHooks/useSessionUser";

export default function useMyInvites() {
  const { state, isLoading: userLoading } = useSessionUser();

  const { data, error, isLoading, mutate } = useSWR<Table[]>(
    state >= State.AUTHENTICATED ? "/table/my-invites" : null,
    () => GalaService.table.getMyInvites(),
    { refreshInterval: 30_000, dedupingInterval: 15_000 },
  );

  return {
    invites: data ?? [],
    isLoading: userLoading || isLoading,
    isError: error,
    mutate,
  };
}
