import { Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { RedirectIfAuthenticated, RequireAuth } from './components/layout/RouteGuards';
import AccountPage from './pages/AccountPage';
import DashboardPage from './pages/DashboardPage';
import InboxPage from './pages/InboxPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import SettingsPage from './pages/SettingsPage';
import SignupPage from './pages/SignupPage';
import TasksPage from './pages/TasksPage';

export default function App() {
  return (
    <Routes>
      {/* Public: only for signed-out users */}
      <Route element={<RedirectIfAuthenticated />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
      </Route>

      {/* Protected: everything else */}
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
