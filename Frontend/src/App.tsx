import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import ClientPage from "./pages/ClientPage";
import LoginPage from "./pages/LoginPage";
import MasterPage from "./pages/MasterPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <BrowserRouter>
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

        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
