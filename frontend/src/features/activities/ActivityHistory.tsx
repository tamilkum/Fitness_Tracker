import type { Activity, Sport } from "../../types";

interface ActivityHistoryProps {
  activities: Activity[];
}

const sportLabels: Record<Sport, string> = {
  running: "Running",
  walking: "Walking",
  cycling: "Cycling",
  gym: "Gym",
  swimming: "Swimming",
  daily_steps: "Daily steps",
};

function describeMeasurement(activity: Activity): string {
  if (activity.distance_km !== null) {
    return `${activity.distance_km} km`;
  }

  if (activity.duration_seconds !== null) {
    const minutes = Math.floor(activity.duration_seconds / 60);
    const seconds = activity.duration_seconds % 60;
    return `${minutes} min ${seconds} sec`;
  }

  return `${activity.steps ?? 0} steps`;
}

export default function ActivityHistory({
  activities,
}: ActivityHistoryProps) {
  return (
    <section className="panel" id="activities">
      <div className="section-heading">
        <div>
          <p className="eyebrow">RECENT MOVEMENT</p>
          <h2>Activity history</h2>
        </div>
      </div>

      {activities.length === 0 ? (
        <p className="empty-state">
          Your logged activities will appear here.
        </p>
      ) : (
        <div className="activity-list">
          {activities.slice(0, 10).map((activity) => (
            <article className="activity-row" key={activity.id}>
              <div>
                <strong>{sportLabels[activity.sport]}</strong>
                <span>{describeMeasurement(activity)}</span>
              </div>

              <time dateTime={activity.occurred_at}>
                {new Date(activity.occurred_at).toLocaleDateString()}
              </time>

              <strong className="activity-points">
                +{activity.points} pts
              </strong>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
