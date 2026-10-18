import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { AchievementsSidebarProvider } from "./AchievementsSidebarContext";
import Layout from "./Layout";
import RequireAuth from "./RequireAuth";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import LeaderboardPage from "../pages/LeaderboardPage";
import ActivitiesPage from "../pages/ActivitiesPage";
import LogActivityPage from "../pages/LogActivityPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — sidebar provider wraps all authenticated pages */}
          <Route
            element={
              <RequireAuth>
                <AchievementsSidebarProvider>
                  <Layout />
                </AchievementsSidebarProvider>
              </RequireAuth>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/activities" element={<ActivitiesPage />} />
            <Route path="/log" element={<LogActivityPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
