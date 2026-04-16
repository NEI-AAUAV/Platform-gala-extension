import { useEffect, useState } from "react";
import GalaService, { ManagerPermissionKey } from "@/services/GalaService";
import { useUserStore } from "@/stores/useUserStore";

export const ALL_PERMISSION_KEYS: ManagerPermissionKey[] = [
  "registration",
  "tables",
  "categories",
  "homepage",
  "buses",
];

type ManagerPermissionsState = {
  isAdmin: boolean;
  permissions: Set<ManagerPermissionKey>;
  loading: boolean;
  error: boolean;
};

export function useManagerPermissions(): ManagerPermissionsState {
  const scopes = useUserStore((s) => s.scopes);
  const [state, setState] = useState<ManagerPermissionsState>({
    isAdmin: false,
    permissions: new Set(),
    loading: true,
    error: false,
  });

  const isAdminUser = scopes?.includes("admin") ?? false;
  const isManagerGala = scopes?.includes("manager-gala") ?? false;

  useEffect(() => {
    if (isAdminUser) {
      setState({ isAdmin: true, permissions: new Set(ALL_PERMISSION_KEYS), loading: false, error: false });
      return;
    }

    if (!isManagerGala) {
      setState({ isAdmin: false, permissions: new Set(), loading: false, error: false });
      return;
    }

    GalaService.permissions
      .getMyPermissions()
      .then((res) =>
        setState({ isAdmin: false, permissions: new Set(res.permissions), loading: false, error: false })
      )
      .catch(() =>
        setState({ isAdmin: false, permissions: new Set(), loading: false, error: true })
      );
  }, [isAdminUser, isManagerGala]);

  return state;
}
