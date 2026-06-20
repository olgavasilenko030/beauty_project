import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import ClientPage from "./pages/ClientPage";
import LoginPage from "./pages/LoginPage";
import MasterPage from "./pages/MasterPage";
import SettingsPage from "./pages/SettingsPage";
import SalonsPage from "./pages/SalonsPage";
import SalonDetailPage from "./pages/SalonDetailPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function App() {
  return (
    <BrowserRouter basename="/beauty_project">
      <Routes>
        {/* Общая точка входа */}
        <Route path="/" element={<HomePage />} />

        {/* Личный кабинет клиента (с вкладкой Мои записи) */}
        <Route path="/client" element={<ClientPage />} />

        {/* Кабинет для бизнеса */}
        <Route path="/admin" element={<AdminPage />} />

        {/* Login */}
        <Route path="/login" element={<LoginPage />} />

        <Route path="/master" element={<MasterPage />} />

        <Route path="/salons" element={<SalonsPage />} />

        <Route path="/salon/:id" element={<SalonDetailPage />} />

        <Route path="/settings" element={<SettingsPage />} />

        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
