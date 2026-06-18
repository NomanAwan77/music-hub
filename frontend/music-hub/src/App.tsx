import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AppShell } from "./common/components/AppShell";
import { AIReceptionist } from "./components/AIReceptionist";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import { AlbumDetailsPage } from "./pages/AlbumDetailsPage";
import { AlbumsPage } from "./pages/AlbumsPage";
import { AuthPage } from "./pages/AuthPage";
import { apiRequest } from "./api/client";

function App() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");

  const onLogout = async () => {
    setUser(null);
    try {
      await apiRequest("/auth/api/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Error logging out:", error);
      setMessage("Failed to sign out");
    }
    setMessage("Signed out Successfully");
    navigate("/auth");
  };

  return (
    <AppShell user={user} onLogout={user ? onLogout : undefined}>
      <Routes>
        <Route
          path="/auth"
          element={<AuthPage message={message} setMessage={setMessage} />}
        />
        <Route
          path="/albums"
          element={
            <ProtectedRoute>
              <AlbumsPage message={message} setMessage={setMessage} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/albums/:albumId"
          element={
            <ProtectedRoute>
              <AlbumDetailsPage message={message} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={<Navigate to={user ? "/albums" : "/auth"} replace />}
        />
        <Route
          path="*"
          element={<Navigate to={user ? "/albums" : "/auth"} replace />}
        />
      </Routes>
      <AIReceptionist />
    </AppShell>
  );
}

export default App;
