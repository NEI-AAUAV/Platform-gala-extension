import { create } from "zustand";
import config from "@/config";

export { shallow } from "zustand/shallow";

function parseJWT(token: string) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replaceAll("-", "+").replaceAll("_", "/");
  const jsonPayload = decodeURIComponent(
    globalThis
      .atob(base64)
      .split("")
      .map((c) => `%${(c.codePointAt(0) ?? 0).toString(16).padStart(2, "0")}`)
      .join(""),
  );
  return JSON.parse(jsonPayload);
}

const defaultTheme =
  localStorage.getItem("th") ||
  (globalThis.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light");
document.body.dataset.theme = defaultTheme;

interface TokenPayload {
  image?: string;
  sub?: string;
  email?: string;
  name?: string;
  surname?: string;
  scopes?: string[];
}

export interface UserState extends TokenPayload {
  sessionLoading: boolean;
  theme?: string;
  token?: string;
  setTheme: (theme: string) => void;
  login: ({ token }: { token: string }) => void;
  logout: () => void;
}

const useUserStore = create<UserState>((set) => ({
  sessionLoading: true,
  theme: defaultTheme,

  setTheme: (theme) => {
    localStorage.setItem("th", theme);
    document.body.dataset.theme = theme;
    set(() => ({ theme }));
  },

  login: ({ token }) => {
    const { image, ...payload }: TokenPayload = token ? parseJWT(token) : {};
    set((state) => ({
      ...state,
      token,
      sessionLoading: false,
      ...payload,
      image: image || `${config.BASE_URL}/gala/default-profile.svg`,
    }));
  },

  logout: () => {
    Object.keys(localStorage)
      .filter(
        (k) =>
          k.startsWith("gala-wizard-state") ||
          k.startsWith("gala_nomination_") ||
          k === "gala_nomination_guide_seen" ||
          k === "gala_voting_guide_seen",
      )
      .forEach((k) => localStorage.removeItem(k));
    set(() => ({
      sessionLoading: false,
      image: undefined,
      sub: undefined,
      name: undefined,
      surname: undefined,
      token: undefined,
    }));
  },
}));

export { useUserStore };
