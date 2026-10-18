import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Used as a layout route wrapper: if not authenticated, redirect to /login.
// When used as <Route element={<RequireAuth><Layout /></RequireAuth>} />,
// the Layout's <Outlet /> renders child routes.
export default function RequireAuth({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children ? <>{children}</> : <Outlet />;
}
