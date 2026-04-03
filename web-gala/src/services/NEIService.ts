import config from "@/config";
import { createClient } from "./client";

const client = createClient(`${config.BASE_URL}/api/nei/v1`);

const NEIService = {
  getUserById: async (id: string | number) => {
    const response: NEIUser = await client.get(`/user/${id}`);
    return response;
  },

  logout: async (): Promise<{ end_session_url: string | null }> => {
    return client.post("/auth/logout");
  },
};

export default NEIService;
