import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CoachData, DashboardData, Sport, SportBreakdown } from "../../types";
import StatCard from "../../components/StatCard";

interface DashboardProps {
  data: DashboardData | null;
  coach: CoachData | null;
  rank: number | null;
  consistencyDays: number;
}

// ── Sport labels ──────────────────────────────────────────────────────────────

const sportLabels: Record<Sport, string> = {
  running: "Running",
  walking: "Walking",
  cycling: "Cycling",
  gym: "Gym",
  swimming: "Swimming",
  daily_steps: "Daily Steps",
};

// ── Pie chart colours — one per sport, ordered to match SPORT_ORDER ──────────

const SPORT_COLORS: Record<Sport, string> = {
  running: "#527c61",
  walking: "#5a7fa8",
  cycling: "#a07830",
  gym: "#7a5ca8",
  swimming: "#3a8a9e",
  daily_steps: "#7a8a40",
};

// ── Build cumulative series from daily history ────────────────────────────────

interface CumulativePoint {
  date: string;
  cumulative: number;
}

function buildCumulative(
  history: DashboardData["history"],
): CumulativePoint[] {
  let running = 0;
  return history.map((d) => {
    running += d.points;
    return { date: d.date, cumulative: running };
  });
}

// ── Pie data from sport_breakdown (points per sport) ─────────────────────────

interface PieSlice {
  name: string;
  value: number;
  sport: Sport;
}

function buildPieData(breakdown: SportBreakdown[]): PieSlice[] {
  return breakdown
    .filter((b) => b.points > 0)
    .map((b) => ({
      name: sportLabels[b.sport] ?? b.sport,
      value: b.points,
      sport: b.sport,
    }));
}

// ── Custom pie label ──────────────────────────────────────────────────────────

function PieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  if (percent < 0.05) return null; // skip tiny slices
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Dashboard({
  data,
  coach,
  rank,
  consistencyDays,
}: DashboardProps) {
  const summary = data ?? {
    total_points: 0,
    activity_count: 0,
    history: [],
    sport_breakdown: [],
  };

  const cumulativeData = buildCumulative(summary.history);
  const pieData = buildPieData(summary.sport_breakdown);

  // For a single-point history, duplicate the point so the line is visible
  const lineData =
    cumulativeData.length === 1
      ? [cumulativeData[0], cumulativeData[0]]
      : cumulativeData;

  return (
    <>
      {/* ── Stat cards ── */}
      <section className="stats-grid" id="dashboard">
        <StatCard
          label="TOTAL POINTS"
          value={summary.total_points.toLocaleString()}
          note="Points from your activities"
        />
        <StatCard
          label="ACTIVE DAYS"
          value={String(consistencyDays)}
          note="Consistency tie-break"
        />
        <StatCard
          label="ACTIVITIES"
          value={String(summary.activity_count)}
          note="Activities logged"
        />
        <StatCard
          label="YOUR RANK"
          value={rank ? `#${rank}` : "—"}
          note="Global leaderboard"
        />
      </section>

      {/* ── Top row: cumulative line + coach ── */}
      <div className="dashboard-grid">
        <section className="panel">
          <p className="eyebrow">YOUR PROGRESS</p>
          <h2>Cumulative points over time</h2>

          {summary.history.length === 0 ? (
            <p className="empty-state">
              Log an activity to see your progress chart.
            </p>
          ) : (
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={lineData}
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="#e9eee8" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#8a978b" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e4ebe3" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#8a978b" }}
                    tickLine={false}
                    axisLine={false}
                    label={{
                      value: "Points",
                      angle: -90,
                      position: "insideLeft",
                      offset: 12,
                      style: { fontSize: 11, fill: "#8a978b" },
                    }}
                  />
                  <Tooltip
                    formatter={(v: number) => [
                      v.toLocaleString(),
                      "Cumulative pts",
                    ]}
                    labelStyle={{ fontSize: 11 }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #e4ebe3",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#527c61"
                    strokeWidth={2.5}
                    dot={
                      cumulativeData.length <= 12
                        ? { r: 4, fill: "#527c61", strokeWidth: 0 }
                        : false
                    }
                    activeDot={{ r: 5 }}
                    name="Cumulative pts"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="panel coach-panel">
          <p className="eyebrow">ACTIVITY-AWARE COACH</p>
          <h2>A little encouragement</h2>
          <p>
            {coach?.message ??
              "Log an activity to get an encouragement based on your routine."}
          </p>
          <p className="coach-days">
            {coach?.active_days_last_7 ?? 0} active days in the last week
          </p>
          <small>
            {coach?.disclaimer ??
              "General encouragement only; not medical advice."}
          </small>
        </section>
      </div>

      {/* ── Bottom row: pie chart + sport breakdown table ── */}
      <div className="dashboard-charts-row">
        {/* Pie / doughnut */}
        <section className="panel">
          <p className="eyebrow">ACTIVITY MIX</p>
          <h2>Points by sport</h2>

          {pieData.length === 0 ? (
            <p className="empty-state">
              Log activities to see your sport breakdown.
            </p>
          ) : (
            <div className="chart chart--pie">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="38%"
                    outerRadius="68%"
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={(props) => <PieLabel {...props} />}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.sport}
                        fill={SPORT_COLORS[entry.sport] ?? "#8a978b"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [
                      v.toLocaleString() + " pts",
                      "Points",
                    ]}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #e4ebe3",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={9}
                    formatter={(value) => (
                      <span style={{ fontSize: 12, color: "#4a6050" }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Sport breakdown table */}
        <section className="panel" id="sport-breakdown">
          <p className="eyebrow">YOUR MIX</p>
          <h2>Sport breakdown</h2>

          {summary.sport_breakdown.length === 0 ? (
            <p className="empty-state">
              Your activity breakdown will appear here.
            </p>
          ) : (
            <div className="sport-list">
              {summary.sport_breakdown.map((item) => (
                <div className="sport-row sport-row--detail" key={item.sport}>
                  <span
                    className="sport-row-dot"
                    style={{
                      background:
                        SPORT_COLORS[item.sport] ?? "#8a978b",
                    }}
                  />
                  <span className="sport-row-name">
                    {sportLabels[item.sport]}
                  </span>
                  <span className="sport-row-count">
                    {item.activities}{" "}
                    {item.activities === 1 ? "activity" : "activities"}
                  </span>
                  <strong className="sport-row-pts">
                    {item.points.toLocaleString()} pts
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
