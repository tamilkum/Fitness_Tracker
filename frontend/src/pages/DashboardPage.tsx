import { useEffect, useRef, useState } from "react";
import { useAuth } from "../app/AuthContext";
import { useAchievementsSidebar } from "../app/AchievementsSidebarContext";
import Dashboard from "../features/dashboard/Dashboard";
import AchievementToast from "../features/achievements/AchievementToast";
import SetTargetModal from "../features/achievements/SetTargetModal";
import { usePersonalTargets } from "../features/achievements/usePersonalTargets";
import { api } from "../services/api";
import type {
  Achievement,
  CoachData,
  DashboardData,
  LeaderboardEntry,
} from "../types";

export default function DashboardPage() {
  const { user } = useAuth();
  const { refreshAchievements, breakdown, toggleSidebar } = useAchievementsSidebar();
  const { addTarget } = usePersonalTargets(breakdown);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [coach, setCoach] = useState<CoachData | null>(null);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [consistencyDays, setConsistencyDays] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const knownSlugsRef = useRef<Set<string>>(new Set());

  async function loadAll(detectNew = false) {
    if (!user) return;
    try {
      const [dashboardData, coachData, leaderboardData, achievementData] =
        await Promise.all([
          api.getDashboard(user.id),
          api.getCoach(user.id),
          api.getLeaderboard(),
          api.getAchievements(user.id),
        ]);

      setDashboard(dashboardData);
      setCoach(coachData);

      const entry = (leaderboardData as LeaderboardEntry[]).find(
        (e) => e.user_id === user.id,
      );
      setRank(entry?.rank ?? null);
      setConsistencyDays(entry?.consistency_days ?? 0);
      setError("");

      if (detectNew) {
        const fresh = achievementData.filter(
          (a) => !knownSlugsRef.current.has(a.slug),
        );
        if (fresh.length > 0) setNewAchievements(fresh);
      }

      knownSlugsRef.current = new Set(achievementData.map((a) => a.slug));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not load dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) return <p className="muted page-loading">Loading…</p>;

  return (
    <>
      {newAchievements.length > 0 && (
        <AchievementToast
          newAchievements={newAchievements}
          onDismiss={() => setNewAchievements([])}
        />
      )}

      {showTargetModal && (
        <SetTargetModal
          onSave={(t) => { addTarget(t); refreshAchievements(); }}
          onClose={() => setShowTargetModal(false)}
        />
      )}

      <div className="page-heading dashboard-page-heading">
        <div>
          <p className="eyebrow">YOUR FITNESS COMMUNITY</p>
          <h1>Welcome back, {user?.first_name}</h1>
          <p className="muted">Track your progress and stay consistent.</p>
        </div>
        <div className="dashboard-heading-actions">
          <button className="secondary-button" onClick={() => setShowTargetModal(true)}>
            🎯 Set a target
          </button>
          <button className="secondary-button" onClick={toggleSidebar}>
            🏅 My Awards
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <Dashboard
        data={dashboard}
        coach={coach}
        rank={rank}
        consistencyDays={consistencyDays}
      />
    </>
  );
}
