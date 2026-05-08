import { useHref } from "react-router-dom";
import config from "@/config";

export default function useLoginLink() {
  const homePathname = useHref("");
  const loginURL = new URL("/api/nei/v1/auth/oidc/login", config.BASE_URL);
  const redirectUrl = new URL(homePathname, config.BASE_URL);

  loginURL.searchParams.set("redirect_to", redirectUrl.toString());

  return loginURL.toString();
}
