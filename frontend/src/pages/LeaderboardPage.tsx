import { useEffect, useState } from "react";
import { useAuth } from "../app/AuthContext";
import Leaderboard from "../features/leaderboard/Leaderboard";
import { api } from "../services/api";
import type { LeaderboardEntry } from "../types";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getLeaderboard();
        setEntries(data);
        setError("");
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load leaderboard.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) return <p className="muted page-loading">Loading…</p>;

  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">FRIENDLY COMPETITION</p>
        <h1>Leaderboard</h1>
        <p className="muted">See where everyone stands.</p>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <Leaderboard entries={entries} currentUserId={user?.id ?? null} />
    </>
  );
}
