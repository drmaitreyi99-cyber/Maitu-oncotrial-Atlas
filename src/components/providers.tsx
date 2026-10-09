"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Attempt, SrsState } from "@/lib/types";

export interface SessionUser {
  email: string;
  name: string;
  role: "resident" | "reviewer";
}

export interface PlannerPrefs {
  examDate: string;
  minutes: number;
  organs: string[];
}

interface Store {
  user: SessionUser | null;
  theme: "light" | "dark";
  bookmarks: string[];
  srs: Record<string, SrsState>;
  attempts: Attempt[];
  reviews: Record<string, "approved_citation" | "rejected">;
  planner: PlannerPrefs | null;
}

const empty: Store = {
  user: null,
  theme: "light",
  bookmarks: [],
  srs: {},
  attempts: [],
  reviews: {},
  planner: null,
};

const KEY = "maitu-oncotrial-v1";

interface AtlasContextValue extends Store {
  ready: boolean;
  login: (user: SessionUser) => void;
  logout: () => void;
  toggleTheme: () => void;
  toggleBookmark: (trialId: string) => void;
  saveSrs: (cardId: string, state: SrsState) => void;
  recordAttempt: (attempt: Attempt) => void;
  setReview: (id: string, decision: "approved_citation" | "rejected") => void;
  savePlanner: (planner: PlannerPrefs) => void;
}

const AtlasContext = createContext<AtlasContextValue | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Store;
        setStore({ ...empty, ...parsed });
        document.documentElement.classList.toggle("dark", parsed.theme === "dark");
      } catch {
        setStore(empty);
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(KEY, JSON.stringify(store));
    document.documentElement.classList.toggle("dark", store.theme === "dark");
  }, [store, ready]);

  const value = useMemo<AtlasContextValue>(() => ({
    ...store,
    ready,
    login: (user) => setStore((current) => ({ ...current, user })),
    logout: () => setStore((current) => ({ ...current, user: null })),
    toggleTheme: () => setStore((current) => ({ ...current, theme: current.theme === "dark" ? "light" : "dark" })),
    toggleBookmark: (trialId) => setStore((current) => ({
      ...current,
      bookmarks: current.bookmarks.includes(trialId)
        ? current.bookmarks.filter((id) => id !== trialId)
        : [...current.bookmarks, trialId],
    })),
    saveSrs: (cardId, state) => setStore((current) => ({ ...current, srs: { ...current.srs, [cardId]: state } })),
    recordAttempt: (attempt) => setStore((current) => ({ ...current, attempts: [...current.attempts, attempt].slice(-500) })),
    setReview: (id, decision) => setStore((current) => ({ ...current, reviews: { ...current.reviews, [id]: decision } })),
    savePlanner: (planner) => setStore((current) => ({ ...current, planner })),
  }), [store, ready]);

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>;
}

export function useAtlas() {
  const value = useContext(AtlasContext);
  if (!value) throw new Error("useAtlas must be used within Providers");
  return value;
}
