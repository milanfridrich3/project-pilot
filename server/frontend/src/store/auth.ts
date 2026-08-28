import { create } from "zustand";
import { api } from "../lib/api";
import type { User } from "../lib/types";
import { useThemeStore } from "./theme";
import { useI18nStore } from "../lib/i18n";

interface AuthState {
  user: User | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  restore: () => Promise<void>;
  updateUser: (user: User) => void;
}

interface AuthResponse {
  token: string;
  user: User;
}

function applyUserPreferences(user: User) {
  useThemeStore.getState().setTheme(user.theme);
  useI18nStore.getState().setLanguage(user.language);
}

function persistUser(user: User) {
  localStorage.setItem("pilot_user", JSON.stringify(user));
  applyUserPreferences(user);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isReady: false,

  restore: async () => {
    const token = localStorage.getItem("pilot_token");
    const userRaw = localStorage.getItem("pilot_user");
    if (!token) {
      set({ isReady: true });
      return;
    }
    if (userRaw) {
      const cached = JSON.parse(userRaw) as User;
      applyUserPreferences(cached);
      set({ user: cached, isReady: true });
    }
    try {
      const fresh = await api.get<User>("/auth/me");
      persistUser(fresh);
      set({ user: fresh, isReady: true });
    } catch {
      if (!userRaw) set({ isReady: true });
    }
  },

  login: async (email, password) => {
    const data = await api.post<AuthResponse>("/auth/login", { email, password });
    localStorage.setItem("pilot_token", data.token);
    persistUser(data.user);
    set({ user: data.user });
  },

  register: async (name, email, password) => {
    const data = await api.post<AuthResponse>("/auth/register", { name, email, password });
    localStorage.setItem("pilot_token", data.token);
    persistUser(data.user);
    set({ user: data.user });
  },

  logout: () => {
    localStorage.removeItem("pilot_token");
    localStorage.removeItem("pilot_user");
    set({ user: null });
  },

  updateUser: (user) => {
    persistUser(user);
    set({ user });
  },
}));
