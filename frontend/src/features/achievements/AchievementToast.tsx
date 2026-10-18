import { useEffect, useState } from "react";
import type { Achievement } from "../../types";

interface AchievementToastProps {
  newAchievements: Achievement[];
  onDismiss: () => void;
}

export default function AchievementToast({
  newAchievements,
  onDismiss,
}: AchievementToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (newAchievements.length === 0) return;
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400); // let fade-out animation finish
    }, 5000);
    return () => clearTimeout(timer);
  }, [newAchievements, onDismiss]);

  if (newAchievements.length === 0 || !visible) return null;

  return (
    <div
      className={`achievement-toast ${visible ? "achievement-toast--in" : "achievement-toast--out"}`}
      role="status"
      aria-live="polite"
    >
      <div className="achievement-toast-icon">🏅</div>
      <div className="achievement-toast-body">
        <p className="achievement-toast-title">
          {newAchievements.length === 1
            ? "New badge unlocked!"
            : `${newAchievements.length} new badges unlocked!`}
        </p>
        {newAchievements.map((a) => (
          <p key={a.id} className="achievement-toast-label">
            {a.label}
          </p>
        ))}
      </div>
      <button
        className="achievement-toast-close"
        onClick={() => {
          setVisible(false);
          setTimeout(onDismiss, 400);
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
