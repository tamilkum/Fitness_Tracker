import { useState, type FormEvent } from "react";
import type { ActivityInput, Sport } from "../../types";

interface ActivityFormProps {
  onSubmit: (activity: ActivityInput) => Promise<void>;
}

const sportLabels: Record<Sport, string> = {
  running: "Running",
  walking: "Walking",
  cycling: "Cycling",
  gym: "Gym",
  swimming: "Swimming",
  daily_steps: "Daily steps",
};

export default function ActivityForm({ onSubmit }: ActivityFormProps) {
  const [sport, setSport] = useState<Sport>("walking");
  const [distance, setDistance] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [seconds, setSeconds] = useState("0");
  const [steps, setSteps] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      let activity: ActivityInput;

      if (["running", "walking", "cycling"].includes(sport)) {
        activity = {
          sport,
          distance_km: Number(distance),
        };
      } else if (sport === "gym" || sport === "swimming") {
        activity = {
          sport,
          duration_seconds:
            Number(minutes) * 60 + Number(seconds),
        };
      } else {
        activity = {
          sport,
          steps: Number(steps),
        };
      }

      await onSubmit(activity);
      setDistance("");
      setSteps("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel" id="log-activity">
      <p className="eyebrow">RECORD YOUR MOVEMENT</p>
      <h2>Log an activity</h2>

      <form className="activity-form" onSubmit={handleSubmit}>
        <label>
          Activity
          <select
            value={sport}
            onChange={(event) => setSport(event.target.value as Sport)}
          >
            {Object.entries(sportLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {["running", "walking", "cycling"].includes(sport) && (
          <label>
            Distance (km)
            <input
              type="number"
              min="0.001"
              step="0.001"
              required
              value={distance}
              onChange={(event) => setDistance(event.target.value)}
              placeholder="For example, 2.5"
            />
          </label>
        )}

        {(sport === "gym" || sport === "swimming") && (
          <div className="duration-fields">
            <label>
              Minutes
              <input
                type="number"
                min="0"
                required
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
              />
            </label>

            <label>
              Seconds
              <input
                type="number"
                min="0"
                max="59"
                required
                value={seconds}
                onChange={(event) => setSeconds(event.target.value)}
              />
            </label>
          </div>
        )}

        {sport === "daily_steps" && (
          <label>
            Steps
            <input
              type="number"
              min="1"
              max="2000000"
              required
              value={steps}
              onChange={(event) => setSteps(event.target.value)}
              placeholder="For example, 6500"
            />
          </label>
        )}

        <button className="primary-button" disabled={submitting}>
          {submitting ? "Saving..." : "Save activity"}
        </button>
      </form>
    </section>
  );
}
