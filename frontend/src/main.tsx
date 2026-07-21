import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.tsx';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import './index.css';

// eslint-disable-next-line react-refresh/only-export-components
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: 'var(--bg)', color: 'var(--text)' }}
      >
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: 'var(--accent)' }}
        ></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <App />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
