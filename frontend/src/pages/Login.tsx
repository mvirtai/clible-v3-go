// frontend/src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4" style={{ background: 'var(--bg)' }}>
      <div
        className="w-full max-w-md p-8 rounded-2xl border animate-fade-in"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 rounded-full mb-3" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
            <BookOpen size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            Clible Workspace
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Kirjaudu sisään jatkaaksesi työtilaasi
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 text-sm rounded-lg border bg-red-500/10 border-red-500/30 text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
              Sähköposti
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border transition-all duration-200 focus:outline-none"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
              Salasana
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border transition-all duration-200 focus:outline-none"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-medium tracking-wide transition-colors focus:outline-none cursor-pointer hover:opacity-90 active:scale-95 duration-150"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg)',
            }}
          >
            {loading ? 'Kirjaudutaan...' : 'Kirjaudu sisään'}
          </button>
        </form>

        <p className="text-sm text-center mt-6" style={{ color: 'var(--muted)' }}>
          Eikö sinulla ole tiliä?{' '}
          <Link to="/register" style={{ color: 'var(--accent)' }} className="hover:underline">
            Rekisteröidy tästä
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
