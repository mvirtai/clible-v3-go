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
        className="w-full max-w-md p-8 rounded-3xl border animate-fade-in"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-full mb-4 transition-transform hover:scale-110 duration-300 flex items-center justify-center"
            style={{
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              border: '1px solid var(--accent-border)',
              boxShadow: '0 4px 12px var(--accent-bg)',
            }}>
            <BookOpen size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            Clible Workspace
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--muted)' }}>
            Kirjaudu sisään jatkaaksesi työtilaasi
          </p>
        </div>

        {error && (
          <div className="p-3 mb-5 text-sm rounded-xl border bg-red-500/10 border-red-500/30 text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
              Sähköposti
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none"
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
              className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none"
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
            className="w-full py-3.5 mt-2 mb-2 rounded-xl font-medium tracking-wide btn-tactile btn-accent focus:outline-none cursor-pointer"
          >
            {loading ? 'Kirjaudutaan...' : 'Kirjaudu sisään'}
          </button>
        </form>

        <p className="text-sm text-center mt-6" style={{ color: 'var(--muted)' }}>
          Eikö sinulla ole tiliä?{' '}
          <Link to="/register" style={{ color: 'var(--accent)' }} className="hover:underline font-medium">
            Rekisteröidy tästä
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
