import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/AuthContext";
import ActivityHistory from "../features/activities/ActivityHistory";
import { api } from "../services/api";
import type { Activity } from "../types";

export default function ActivitiesPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const data = await api.getActivities(user!.id);
        setActivities(data);
        setError("");
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load activities.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user]);

  if (loading) return <p className="muted page-loading">Loading…</p>;

  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">YOUR MOVEMENT</p>
        <h1>Activity history</h1>
        <p className="muted">Your logged activities, most recent first.</p>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <div className="page-action-row">
        <Link to="/log" className="primary-button">
          + Log new activity
        </Link>
      </div>

      <ActivityHistory activities={activities} />
    </>
  );
}
