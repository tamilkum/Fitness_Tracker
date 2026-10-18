import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import AchievementsPanel from "../features/achievements/AchievementsPanel";
import { useAchievementsSidebar } from "./AchievementsSidebarContext";
import ProfileMenu from "../features/profile/ProfileMenu";
import FitnessChat from "../features/chat/FitnessChat";

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { achievements, personalTargets, sidebarOpen, toggleSidebar } =
    useAchievementsSidebar();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className={`app-shell ${sidebarOpen ? "app-shell--sidebar-open" : ""}`}>
      {/* Left awards sidebar */}
      <AchievementsPanel
        achievements={achievements}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        personalTargets={personalTargets}
      />

      <div className="app-main">
        <header className="topbar">
          <NavLink className="brand" to="/dashboard">
            <span className="brand-icon">S</span>
            <span>stride</span>
          </NavLink>

          <nav>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => (isActive ? "nav-active" : "")}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/leaderboard"
              className={({ isActive }) => (isActive ? "nav-active" : "")}
            >
              Leaderboard
            </NavLink>
            <NavLink
              to="/activities"
              className={({ isActive }) => (isActive ? "nav-active" : "")}
            >
              Activities
            </NavLink>
            <NavLink
              to="/log"
              className={({ isActive }) => (isActive ? "nav-active" : "")}
            >
              Log Activity
            </NavLink>
          </nav>

          <div className="topbar-right">
            {/* Profile avatar icon — replaces plain text name */}
            <ProfileMenu />
            <button className="logout-button" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>

        <footer>
          Stride Fitness Challenge <span>·</span> Every step counts
        </footer>
      </div>

      {/* Floating chatbot — fixed bottom-right, available on all pages */}
      <FitnessChat />
    </div>
  );
}
