/**
 * Extracts a human-readable error message from an Axios error response.
 * FastAPI returns errors as { detail: string | { msg: string }[] }
 */
export function extractApiError(error: unknown, fallback = "Ocorreu um erro. Tenta novamente."): string {
  if (!error || typeof error !== "object") return fallback;

  const axiosError = error as { response?: { data?: { detail?: unknown } }; message?: string };
  const detail = axiosError.response?.data?.detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "object" && first !== null && "msg" in first) {
      return String((first as { msg: string }).msg);
    }
  }

  if (typeof axiosError.message === "string" && axiosError.message !== "Network Error") {
    return axiosError.message;
  }

  return fallback;
}
