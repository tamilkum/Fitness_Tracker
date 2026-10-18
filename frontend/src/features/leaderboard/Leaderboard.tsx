import type { LeaderboardEntry } from "../../types";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string | null;
}

function movementLabel(change: number | null): string {
  if (change === null) return "—";
  if (change > 0) return `↑ ${change}`;
  if (change < 0) return `↓ ${Math.abs(change)}`;
  return "→";
}

export default function Leaderboard({
  entries,
  currentUserId,
}: LeaderboardProps) {
  return (
    <section className="panel" id="leaderboard">
      <div className="section-heading">
        <div>
          <p className="eyebrow">FRIENDLY COMPETITION</p>
          <h2>Global leaderboard</h2>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="empty-state">
          Be the first to join the challenge.
        </p>
      ) : (
        <div className="leaderboard">
          <div className="leaderboard-header">
            <span>Rank and athlete</span>
            <span>Active days</span>
            <span>Points</span>
            <span>Trend</span>
          </div>

          {entries.map((entry) => (
            <div
              className={`leaderboard-row ${
                entry.user_id === currentUserId ? "current-user" : ""
              }`}
              key={entry.user_id}
            >
              <span className="leader-name">
                <b>#{entry.rank}</b>
                {entry.name}
                {entry.user_id === currentUserId && (
                  <small className="you-tag">YOU</small>
                )}
              </span>

              <span>{entry.consistency_days}</span>
              <strong>{entry.total_points.toLocaleString()}</strong>

              <span
                className={
                  entry.rank_change === null
                    ? "trend-neutral"
                    : entry.rank_change > 0
                      ? "trend-up"
                      : entry.rank_change < 0
                        ? "trend-down"
                        : "trend-neutral"
                }
                title="Compared with the previous challenge period"
              >
                {movementLabel(entry.rank_change)}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="tie-note">
        Points rank first. If points tie, more active days ranks higher.
      </p>
    </section>
  );
}
