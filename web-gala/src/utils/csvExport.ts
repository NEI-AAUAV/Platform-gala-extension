import axios from "axios";
import { useUserStore } from "@/stores/useUserStore";

export async function downloadCsv(path: string, filename: string) {
  const { token } = useUserStore.getState();
  const response = await axios.get(path, {
    responseType: "blob",
    headers: { Authorization: `Bearer ${token}` },
  });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
