import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext";
import { useAchievementsSidebar } from "../app/AchievementsSidebarContext";
import ActivityForm from "../features/activities/ActivityForm";
import AchievementToast from "../features/achievements/AchievementToast";
import { api } from "../services/api";
import type { Achievement, ActivityInput } from "../types";

export default function LogActivityPage() {
  const { user } = useAuth();
  const { refreshAchievements } = useAchievementsSidebar();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  // Track slugs known before this submission so we can detect newly earned ones
  const knownSlugsRef = useRef<Set<string>>(new Set());

  async function handleSubmit(activity: ActivityInput): Promise<void> {
    if (!user) return;

    try {
      // Snapshot current achievements before saving
      const before = await api.getAchievements(user.id);
      knownSlugsRef.current = new Set(before.map((a) => a.slug));

      await api.addActivity(user.id, activity);

      // Fetch achievements again and surface any new ones
      const after = await api.getAchievements(user.id);
      const fresh = after.filter((a) => !knownSlugsRef.current.has(a.slug));

      // Refresh sidebar so new badges appear immediately
      void refreshAchievements();

      setError("");
      setSuccess(true);

      if (fresh.length > 0) {
        setNewAchievements(fresh);
        // Redirect after a longer delay so the user sees the toast
        setTimeout(() => navigate("/activities"), 5500);
      } else {
        setTimeout(() => navigate("/activities"), 1200);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save that activity.",
      );
      throw caught;
    }
  }

  return (
    <>
      {newAchievements.length > 0 && (
        <AchievementToast
          newAchievements={newAchievements}
          onDismiss={() => setNewAchievements([])}
        />
      )}

      <div className="page-heading">
        <p className="eyebrow">RECORD YOUR MOVEMENT</p>
        <h1>Log an activity</h1>
        <p className="muted">Choose your sport and fill in the measurement.</p>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="success-banner" role="status">
          {newAchievements.length > 0
            ? "Activity saved — you earned a new badge! 🏅"
            : "Activity saved! Redirecting to your history…"}
        </div>
      )}

      <ActivityForm onSubmit={handleSubmit} />
    </>
  );
}
