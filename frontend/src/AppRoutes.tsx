import { lazy, type JSX } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import App from './App';

// Lazy load secondary authentication and settings pages to keep initial chunk minimal
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const UserSettingsView = lazy(() =>
  import('./views/UserSettingsView').then((m) => ({ default: m.UserSettingsView }))
);

/**
 * AppRoutes defines the top-level route mapping for Clible.
 * Separated from main.tsx to ensure Fast Refresh compliance.
 */
export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/settings" element={<UserSettingsView />} />
      <Route path="/guest" element={<App />} />
      <Route path="/vierailija-yleinen" element={<Navigate to="/guest" replace />} />
      <Route path="/*" element={<App />} />
    </Routes>
  );
}
