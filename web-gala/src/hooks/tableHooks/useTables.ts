import useSWR from "swr";
import GalaService from "@/services/GalaService";
import useSessionUser, { State } from "../userHooks/useSessionUser";

export default function useTables() {
  const { state, isLoading: isUserLoading } = useSessionUser();

  const key = isUserLoading ? null : `/table/list/${state}`;

  const { data, error, isLoading, mutate } = useSWR<Table[]>(
    key,
    () =>
      state === State.NONE
        ? GalaService.table.listTablesPublic()
        : GalaService.table.listTables(),
    { refreshInterval: 30_000, dedupingInterval: 15_000 },
  );

  return {
    tables: data ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}
