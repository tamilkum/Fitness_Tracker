import { useState } from "react";
import type { Achievement } from "../../types";

interface AchievementsPanelProps {
  achievements: Achievement[];
  isOpen: boolean;
  onToggle: () => void;
  personalTargets?: PersonalTarget[];
}

export interface PersonalTarget {
  sport: string;
  label: string;         // e.g. "Run 25 km"
  targetValue: number;
  unit: string;
  currentValue: number;
  reached: boolean;
}

// ── Sport metadata ────────────────────────────────────────────────────────────

const SPORT_META: Record<string, { emoji: string; color: string; bg: string }> = {
  running:     { emoji: "🏃", color: "#4d8659", bg: "#e8f5ec" },
  walking:     { emoji: "🚶", color: "#5a7fa8", bg: "#e8f0f8" },
  cycling:     { emoji: "🚴", color: "#a07830", bg: "#f5edd8" },
  swimming:    { emoji: "🏊", color: "#3a8a9e", bg: "#ddf0f5" },
  gym:         { emoji: "🏋️", color: "#7a5ca8", bg: "#ede8f5" },
  daily_steps: { emoji: "👟", color: "#7a8a40", bg: "#edf0d8" },
};

function metaForSlug(slug: string) {
  for (const [sport, meta] of Object.entries(SPORT_META)) {
    if (slug.startsWith(sport)) return meta;
  }
  return { emoji: "🏅", color: "#527c61", bg: "#e8f2ea" };
}

// Parse "Running — 10 km" → "10 km milestone"
function milestoneSubtitle(label: string): string {
  const parts = label.split("—");
  if (parts.length === 2) return `${parts[1].trim()} milestone`;
  return label;
}

// ── Badge card ────────────────────────────────────────────────────────────────

function BadgeCard({ achievement }: { achievement: Achievement }) {
  const meta = metaForSlug(achievement.slug);
  const isPersonal = achievement.slug.startsWith("personal_target_");

  const date = new Date(achievement.unlocked_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="award-card" style={{ "--award-bg": meta.bg, "--award-color": meta.color } as React.CSSProperties}>
      <div className="award-badge-circle" style={{ background: meta.bg }}>
        <span className="award-badge-emoji">{isPersonal ? "🎯" : meta.emoji}</span>
      </div>
      <div className="award-card-body">
        <p className="award-card-title">
          {isPersonal ? "Personal Goal" : achievement.label.split("—")[0].trim()}
        </p>
        <p className="award-card-sub">
          {isPersonal ? achievement.label : milestoneSubtitle(achievement.label)}
        </p>
        <p className="award-card-date">{date}</p>
      </div>
      {isPersonal && <span className="award-personal-tag">YOUR GOAL</span>}
    </div>
  );
}

// ── Personal target card ──────────────────────────────────────────────────────

function TargetCard({ target }: { target: PersonalTarget }) {
  const meta = SPORT_META[target.sport] ?? { emoji: "🎯", color: "#527c61", bg: "#e8f2ea" };
  const pct = Math.min(100, Math.round((target.currentValue / target.targetValue) * 100));

  return (
    <div className={`award-target-card ${target.reached ? "award-target--done" : ""}`}>
      <div className="award-target-header">
        <span>{meta.emoji}</span>
        <span className="award-target-label">{target.label}</span>
        {target.reached && <span className="award-personal-tag">DONE!</span>}
      </div>
      <div className="award-target-bar-bg">
        <div
          className="award-target-bar-fill"
          style={{ width: `${pct}%`, background: meta.color }}
        />
      </div>
      <p className="award-target-progress">
        {target.currentValue.toFixed(1)} / {target.targetValue} {target.unit} ({pct}%)
      </p>
    </div>
  );
}

// ── Sport section ─────────────────────────────────────────────────────────────

const SPORT_ORDER = ["running", "walking", "cycling", "swimming", "gym", "daily_steps"];

// ── Main panel ────────────────────────────────────────────────────────────────

export default function AchievementsPanel({
  achievements,
  isOpen,
  onToggle,
  personalTargets = [],
}: AchievementsPanelProps) {
  const [activeTab, setActiveTab] = useState<"awards" | "targets">("awards");

  // Group by sport
  const bySport: Record<string, Achievement[]> = {};
  for (const a of achievements) {
    for (const sport of SPORT_ORDER) {
      if (a.slug.startsWith(sport)) {
        (bySport[sport] ??= []).push(a);
        break;
      }
    }
    if (a.slug.startsWith("personal_target_")) {
      (bySport["personal"] ??= []).push(a);
    }
  }

  const totalBadges = achievements.length;

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        className="awards-toggle"
        onClick={onToggle}
        aria-label={isOpen ? "Close Awards" : "Open Awards"}
        aria-expanded={isOpen}
      >
        <span className="awards-toggle-icon">{isOpen ? "◀" : "🏅"}</span>
        {!isOpen && totalBadges > 0 && (
          <span className="awards-toggle-count">{totalBadges}</span>
        )}
      </button>

      {/* Sidebar drawer */}
      <aside className={`awards-sidebar ${isOpen ? "awards-sidebar--open" : ""}`} aria-hidden={!isOpen}>
        <div className="awards-sidebar-inner">

          {/* Header */}
          <div className="awards-header">
            <div className="awards-header-left">
              <span className="awards-header-icon">🏆</span>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>YOUR AWARDS</p>
                <h3 className="awards-title">Achievements</h3>
              </div>
            </div>
            <button className="awards-close" onClick={onToggle} aria-label="Close">✕</button>
          </div>

          {/* Tabs */}
          <div className="awards-tabs">
            <button
              className={`awards-tab ${activeTab === "awards" ? "awards-tab--active" : ""}`}
              onClick={() => setActiveTab("awards")}
            >
              Badges {totalBadges > 0 && <span className="awards-tab-count">{totalBadges}</span>}
            </button>
            <button
              className={`awards-tab ${activeTab === "targets" ? "awards-tab--active" : ""}`}
              onClick={() => setActiveTab("targets")}
            >
              My Targets {personalTargets.length > 0 && (
                <span className="awards-tab-count">{personalTargets.length}</span>
              )}
            </button>
          </div>

          {/* ── Awards tab ── */}
          {activeTab === "awards" && (
            <div className="awards-scroll">
              {totalBadges === 0 ? (
                <div className="awards-empty">
                  <span className="awards-empty-icon">🏅</span>
                  <p>No badges yet</p>
                  <p className="awards-empty-hint">
                    Run 10 km, walk 50 km, or cycle 100 km to earn your first badge.
                  </p>
                </div>
              ) : (
                <>
                  {/* Personal target achievements at top */}
                  {(bySport["personal"] ?? []).length > 0 && (
                    <div className="awards-group">
                      <p className="awards-group-label">🎯 Personal Goals</p>
                      {(bySport["personal"] ?? []).map((a) => (
                        <BadgeCard key={a.id} achievement={a} />
                      ))}
                    </div>
                  )}

                  {/* Sport milestone badges */}
                  {SPORT_ORDER.map((sport) => {
                    const earned = bySport[sport] ?? [];
                    if (earned.length === 0) return null;
                    const meta = SPORT_META[sport];
                    const sportLabel = sport.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
                    return (
                      <div className="awards-group" key={sport}>
                        <p className="awards-group-label">
                          {meta?.emoji} {sportLabel}
                        </p>
                        {earned.map((a) => (
                          <BadgeCard key={a.id} achievement={a} />
                        ))}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* ── Targets tab ── */}
          {activeTab === "targets" && (
            <div className="awards-scroll">
              {personalTargets.length === 0 ? (
                <div className="awards-empty">
                  <span className="awards-empty-icon">🎯</span>
                  <p>No targets set yet</p>
                  <p className="awards-empty-hint">
                    Set a personal target from the Dashboard to track your progress here.
                  </p>
                </div>
              ) : (
                <div className="awards-group">
                  {personalTargets.map((t) => (
                    <TargetCard key={`${t.sport}-${t.targetValue}`} target={t} />
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="awards-footer">
            {totalBadges} badge{totalBadges !== 1 ? "s" : ""} earned
          </p>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="awards-overlay" onClick={onToggle} aria-hidden="true" />
      )}
    </>
  );
}
