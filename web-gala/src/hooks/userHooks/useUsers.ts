import { useState, useEffect, useCallback } from "react";
import GalaService from "@/services/GalaService";

export default function useUsers() {
  const [users, setUsers] = useState<User[]>([]);

  const fetch = useCallback(async () => {
    const response = await GalaService.user.listUsers();
    setUsers(response);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { users, mutate: fetch };
}
