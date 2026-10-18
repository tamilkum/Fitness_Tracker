/**
 * Manages personal fitness targets stored in localStorage.
 *
 * A target has a sport, a value (in the sport's natural unit), and a label
 * the user wrote. Progress is computed from the SportBreakdown data already
 * loaded by the dashboard — no extra API call.
 */

import { useState, useEffect, useCallback } from "react";
import type { SportBreakdown } from "../../types";
import type { PersonalTarget } from "./AchievementsPanel";

interface StoredTarget {
  sport: string;
  label: string;       // user-written description, e.g. "Run 25 km this month"
  targetValue: number; // in the sport's natural unit
  unit: string;        // "km", "min", "steps"
}

const KEY = "fitness-challenge-targets";

function load(): StoredTarget[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as StoredTarget[];
  } catch {
    return [];
  }
}

function save(targets: StoredTarget[]) {
  localStorage.setItem(KEY, JSON.stringify(targets));
}

function currentValueFor(sport: string, breakdown: SportBreakdown[]): { value: number; unit: string } {
  const row = breakdown.find((b) => b.sport === sport);
  if (!row) return { value: 0, unit: "km" };

  if (sport === "daily_steps") return { value: row.steps, unit: "steps" };
  if (sport === "gym" || sport === "swimming") return { value: row.duration_minutes, unit: "min" };
  return { value: Number(row.distance_km), unit: "km" };
}

export function usePersonalTargets(breakdown: SportBreakdown[]) {
  const [stored, setStored] = useState<StoredTarget[]>(load);

  // Re-read from storage when breakdown changes (e.g. after logging an activity)
  useEffect(() => {
    setStored(load());
  }, [breakdown]);

  const targets: PersonalTarget[] = stored.map((t) => {
    const { value } = currentValueFor(t.sport, breakdown);
    return {
      sport: t.sport,
      label: t.label,
      targetValue: t.targetValue,
      unit: t.unit,
      currentValue: value,
      reached: value >= t.targetValue,
    };
  });

  const addTarget = useCallback((target: StoredTarget) => {
    setStored((prev) => {
      // Replace if same sport+targetValue already exists
      const filtered = prev.filter(
        (t) => !(t.sport === target.sport && t.targetValue === target.targetValue),
      );
      const next = [...filtered, target];
      save(next);
      return next;
    });
  }, []);

  const removeTarget = useCallback((sport: string, targetValue: number) => {
    setStored((prev) => {
      const next = prev.filter(
        (t) => !(t.sport === sport && t.targetValue === targetValue),
      );
      save(next);
      return next;
    });
  }, []);

  return { targets, addTarget, removeTarget };
}
