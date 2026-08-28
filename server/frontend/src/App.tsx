import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthPage } from "./pages/AuthPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { Dashboard } from "./pages/Dashboard";
import { ProjectPage } from "./pages/ProjectPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { FollowListPage } from "./pages/FollowListPage";
import { useAuthStore } from "./store/auth";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isReady = useAuthStore((s) => s.isReady);
  if (!isReady) return null;
  if (!user) return <Navigate to="/prihlaseni" replace />;
  if (!user.emailVerified) return <Navigate to="/overeni" replace />;
  return <>{children}</>;
}

function RequireUnverified({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isReady = useAuthStore((s) => s.isReady);
  if (!isReady) return null;
  if (!user) return <Navigate to="/prihlaseni" replace />;
  if (user.emailVerified) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  const restore = useAuthStore((s) => s.restore);
  const isReady = useAuthStore((s) => s.isReady);

  useEffect(() => {
    restore();
  }, [restore]);

  if (!isReady) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/prihlaseni" element={<AuthPage />} />
        <Route path="/zapomenute-heslo" element={<ForgotPasswordPage />} />
        <Route
          path="/overeni"
          element={
            <RequireUnverified>
              <VerifyEmailPage />
            </RequireUnverified>
          }
        />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/projekty/:id"
          element={
            <RequireAuth>
              <ProjectPage />
            </RequireAuth>
          }
        />
        <Route
          path="/nastaveni"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/profil"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/profil/:id"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/profil/:id/sledujici"
          element={
            <RequireAuth>
              <FollowListPage mode="followers" />
            </RequireAuth>
          }
        />
        <Route
          path="/profil/:id/sledovani"
          element={
            <RequireAuth>
              <FollowListPage mode="following" />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
