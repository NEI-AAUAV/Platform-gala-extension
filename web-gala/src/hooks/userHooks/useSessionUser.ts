import useSWR from "swr";
import GalaService from "@/services/GalaService";
import { useUserStore } from "@/stores/useUserStore";

export const State = {
  NONE: 0,
  AUTHENTICATED: 1,
  REGISTERED: 2,
};

export default function useSessionUser() {
  const { image, sub, email, name, surname, scopes } = useUserStore(
    (state) => state,
  );
  // Key includes `sub` so switching accounts invalidates the cache immediately.
  const swrKey = sub === undefined ? null : `/user/me?sub=${sub}`;
  const { data, error, isLoading, mutate } = useSWR<User>(
    swrKey,
    () => GalaService.user.getSessionUser(),
    { dedupingInterval: 10000000 },
  );

  let state = State.NONE;
  if (sub !== undefined) {
    state = State.AUTHENTICATED;
  }
  if (data?.is_registered === true) {
    state = State.REGISTERED;
  }

  return {
    sessionUser: { ...data, image, sub, name, email, surname, scopes },
    state,
    isError: error,
    isLoading,
    mutate,
  };
}
