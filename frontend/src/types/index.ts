export type Sport =
  | "running"
  | "walking"
  | "cycling"
  | "gym"
  | "swimming"
  | "daily_steps";

export interface User {
  id: string;          // UUID
  first_name: string;
  last_name: string;
  created_at: string;
  // Profile fields — now persisted in the backend DB
  email?: string;
  age?: number | null;
  date_of_birth?: string | null;
  country?: string | null;
  state_province?: string | null;
  // Backend uses `city` and `house_address`; UI aliases kept for compatibility
  city?: string | null;
  house_address?: string | null;
  city_village?: string | null;  // alias → city
  address?: string | null;       // alias → house_address
}

export interface Activity {
  id: number;
  user_id: string;     // UUID
  sport: Sport;
  distance_km: number | string | null;
  duration_seconds: number | null;
  steps: number | null;
  points: number;
  occurred_at: string;
}

export interface ActivityInput {
  sport: Sport;
  distance_km?: number;
  duration_seconds?: number;
  steps?: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;     // UUID
  name: string;
  total_points: number;
  consistency_days: number;
  rank_change: number | null;
}

export interface ActivityDaySummary {
  date: string;
  points: number;
  activities: number;
}

export interface SportBreakdown {
  sport: Sport;
  activities: number;
  points: number;
  distance_km: number | string;
  duration_minutes: number;
  steps: number;
}

export interface DashboardData {
  total_points: number;
  activity_count: number;
  history: ActivityDaySummary[];
  sport_breakdown: SportBreakdown[];
}

export interface Achievement {
  id: number;
  slug: string;
  label: string;
  unlocked_at: string;
}

export interface CoachData {
  active_days_last_7: number;
  message: string;
  disclaimer: string;
}

export interface ChatResponse {
  answer: string;
}
