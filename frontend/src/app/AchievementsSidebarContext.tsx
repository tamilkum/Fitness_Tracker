/**
 * Provides achievements data and sidebar open/close state to the whole app.
 * Loaded once when the user is authenticated; refreshed after each activity.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../services/api";
import { useAuth } from "./AuthContext";
import type { Achievement, SportBreakdown } from "../types";
import { usePersonalTargets } from "../features/achievements/usePersonalTargets";
import type { PersonalTarget } from "../features/achievements/AchievementsPanel";

interface SidebarContextValue {
  achievements: Achievement[];
  personalTargets: PersonalTarget[];
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  refreshAchievements: () => Promise<void>;
  breakdown: SportBreakdown[];
}

const Ctx = createContext<SidebarContextValue | null>(null);

export function AchievementsSidebarProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [breakdown, setBreakdown] = useState<SportBreakdown[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { targets: personalTargets } = usePersonalTargets(breakdown);

  const refreshAchievements = useCallback(async () => {
    if (!user) return;
    try {
      const [data, dashData] = await Promise.all([
        api.getAchievements(user.id),
        api.getDashboard(user.id),
      ]);
      setAchievements(data);
      setBreakdown(dashData.sport_breakdown);
    } catch {
      // silently — Dashboard page will show its own error
    }
  }, [user]);

  useEffect(() => {
    void refreshAchievements();
  }, [refreshAchievements]);

  function toggleSidebar() {
    setSidebarOpen((v) => !v);
  }

  return (
    <Ctx.Provider
      value={{
        achievements,
        personalTargets,
        sidebarOpen,
        toggleSidebar,
        refreshAchievements,
        breakdown,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAchievementsSidebar(): SidebarContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAchievementsSidebar must be inside AchievementsSidebarProvider");
  return ctx;
}
