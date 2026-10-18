import { useState, type FormEvent } from "react";
import type { Sport } from "../../types";

interface SetTargetModalProps {
  onSave: (target: { sport: string; label: string; targetValue: number; unit: string }) => void;
  onClose: () => void;
}

const SPORT_UNITS: Record<Sport, string> = {
  running: "km",
  walking: "km",
  cycling: "km",
  swimming: "min",
  gym: "min",
  daily_steps: "steps",
};

const SPORT_LABELS: Record<Sport, string> = {
  running: "Running",
  walking: "Walking",
  cycling: "Cycling",
  swimming: "Swimming",
  gym: "Gym",
  daily_steps: "Daily Steps",
};

const SPORTS = Object.keys(SPORT_LABELS) as Sport[];

export default function SetTargetModal({ onSave, onClose }: SetTargetModalProps) {
  const [sport, setSport] = useState<Sport>("running");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");

  const unit = SPORT_UNITS[sport];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return;
    const finalLabel = label.trim() || `${SPORT_LABELS[sport]}: ${num} ${unit}`;
    onSave({ sport, label: finalLabel, targetValue: num, unit });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Set a personal target</h3>
          <button className="awards-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Activity
            <select value={sport} onChange={(e) => setSport(e.target.value as Sport)}>
              {SPORTS.map((s) => (
                <option key={s} value={s}>{SPORT_LABELS[s]}</option>
              ))}
            </select>
          </label>

          <label>
            Target ({unit})
            <input
              type="number"
              required
              min="0.1"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`e.g. ${unit === "km" ? "25" : unit === "min" ? "120" : "50000"}`}
            />
          </label>

          <label>
            Description (optional)
            <input
              maxLength={80}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`e.g. Run ${value || "25"} km total`}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="modal-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button">Save target</button>
          </div>
        </form>
      </div>
    </div>
  );
}
